import { CodeError } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import merge from 'it-merge'
import parallel from 'it-parallel'
import { codes, messages } from './errors.js'
import type { Logger, PeerId, PeerInfo, PeerRouting, PeerStore, RoutingOptions } from '@libp2p/interface'
import type { ComponentLogger } from '@libp2p/logger'

export interface PeerRoutingInit {
  routers?: PeerRouting[]
}

export interface DefaultPeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
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
  }

  /**
   * Iterates over all peer routers in parallel to find the given peer
   */
  async findPeer (id: PeerId, options?: RoutingOptions): Promise<PeerInfo> {
    if (this.routers.length === 0) {
      throw new CodeError('No peer routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    if (id.toString() === this.peerId.toString()) {
      throw new CodeError('Should not try to find self', codes.ERR_FIND_SELF)
    }

    const self = this
    const source = merge(
      ...this.routers.map(router => (async function * () {
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
        })
      }

      return peer
    }

    throw new CodeError(messages.NOT_FOUND, codes.ERR_NOT_FOUND)
  }

  /**
   * Attempt to find the closest peers on the network to the given key
   */
  async * getClosestPeers (key: Uint8Array, options: RoutingOptions = {}): AsyncIterable<PeerInfo> {
    if (this.routers.length === 0) {
      throw new CodeError('No peer routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    const self = this
    const seen = new PeerSet()

    for await (const peer of parallel(
      async function * () {
        const source = merge(
          ...self.routers.map(router => router.getClosestPeers(key, options))
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
        })
      }

      // deduplicate peers
      if (seen.has(peer.id)) {
        continue
      }

      seen.add(peer.id)

      yield peer
    }
  }
}
