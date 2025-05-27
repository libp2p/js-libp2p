import { NotFoundError } from '@libp2p/interface'
import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import merge from 'it-merge'
import parallel from 'it-parallel'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { NoPeerRoutersError, QueriedForSelfError } from './errors.js'
import type { Logger, Metrics, PeerId, PeerInfo, PeerRouting, PeerStore, RoutingOptions } from '@libp2p/interface'
import type { ComponentLogger } from '@libp2p/logger'

export interface PeerRoutingInit {
  routers?: PeerRouting[]
}

export interface DefaultPeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
  metrics?: Metrics
}

export class DefaultPeerRouting implements PeerRouting {
  private readonly log: Logger
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly routers: PeerRouting[]

  constructor (components: DefaultPeerRoutingComponents, init: PeerRoutingInit = {}) {
    this.log = components.logger.forComponent('libp2p:peer-routing')
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.routers = init.routers ?? []

    this.findPeer = components.metrics?.traceFunction('libp2p.peerRouting.findPeer', this.findPeer.bind(this), {
      optionsIndex: 1,
      getAttributesFromArgs: ([peer], attrs) => {
        return {
          ...attrs,
          peer: peer.toString()
        }
      }
    }) ?? this.findPeer
    this.getClosestPeers = components.metrics?.traceFunction('libp2p.peerRouting.getClosestPeers', this.getClosestPeers.bind(this), {
      optionsIndex: 1,
      getAttributesFromArgs: ([key], attrs) => {
        return {
          ...attrs,
          key: uint8ArrayToString(key, 'base36')
        }
      },
      getAttributesFromYieldedValue: (value, attrs: { peers?: string[] }) => {
        return {
          ...attrs,
          peers: [...(Array.isArray(attrs.peers) ? attrs.peers : []), value.id.toString()]
        }
      }
    }) ?? this.getClosestPeers
  }

  readonly [Symbol.toStringTag] = '@libp2p/peer-routing'

  /**
   * Iterates over all peer routers in parallel to find the given peer
   */
  async findPeer (id: PeerId, options?: RoutingOptions): Promise<PeerInfo> {
    if (this.routers.length === 0) {
      throw new NoPeerRoutersError('No peer routers available')
    }

    if (id.toString() === this.peerId.toString()) {
      throw new QueriedForSelfError('Should not try to find self')
    }

    const self = this
    const source = merge(
      ...this.routers
        .filter(router => router.findPeer instanceof Function)
        .map(router => (async function * () {
          try {
            yield await router.findPeer(id, options)
          } catch (err) {
            self.log.error(err)
          }
        })())
    )

    for await (const peer of source) {
      if (peer == null) {
        continue
      }

      // store the addresses for the peer if found
      if (peer.multiaddrs.length > 0) {
        await this.peerStore.merge(peer.id, {
          multiaddrs: peer.multiaddrs
        }, options)
      }

      return peer
    }

    throw new NotFoundError()
  }

  /**
   * Attempt to find the closest peers on the network to the given key
   */
  async * getClosestPeers (key: Uint8Array, options: RoutingOptions = {}): AsyncGenerator<PeerInfo> {
    if (this.routers.length === 0) {
      throw new NoPeerRoutersError('No peer routers available')
    }

    const self = this
    const seen = createScalableCuckooFilter(1024)

    for await (const peer of parallel(
      async function * () {
        const source = merge(
          ...self.routers
            .filter(router => router.getClosestPeers instanceof Function)
            .map(router => router.getClosestPeers(key, options))
        )

        for await (let peer of source) {
          yield async () => {
            // find multiaddrs if they are missing
            if (peer.multiaddrs.length === 0) {
              try {
                peer = await self.findPeer(peer.id, {
                  ...options,
                  useCache: false
                })
              } catch (err) {
                self.log.error('could not find peer multiaddrs', err)
                return
              }
            }

            return peer
          }
        }
      }()
    )) {
      if (peer == null) {
        continue
      }

      // store the addresses for the peer if found
      if (peer.multiaddrs.length > 0) {
        await this.peerStore.merge(peer.id, {
          multiaddrs: peer.multiaddrs
        }, options)
      }

      // deduplicate peers
      if (seen.has(peer.id.toMultihash().bytes)) {
        continue
      }

      seen.add(peer.id.toMultihash().bytes)

      yield peer
    }
  }
}
