import { CodeError } from '@libp2p/interfaces/errors'
import { logger } from '@libp2p/logger'
import filter from 'it-filter'
import first from 'it-first'
import merge from 'it-merge'
import { pipe } from 'it-pipe'
import {
  storeAddresses,
  uniquePeers,
  requirePeers
} from './content-routing/utils.js'
import { codes, messages } from './errors.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { AbortOptions } from '@libp2p/interfaces'

const log = logger('libp2p:peer-routing')

export interface PeerRoutingInit {
  routers?: PeerRouting[]
}

export interface DefaultPeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
}

export class DefaultPeerRouting implements PeerRouting {
  private readonly components: DefaultPeerRoutingComponents
  private readonly routers: PeerRouting[]

  constructor (components: DefaultPeerRoutingComponents, init: PeerRoutingInit) {
    this.components = components
    this.routers = init.routers ?? []
  }

  /**
   * Iterates over all peer routers in parallel to find the given peer
   */
  async findPeer (id: PeerId, options?: AbortOptions): Promise<PeerInfo> {
    if (this.routers.length === 0) {
      throw new CodeError('No peer routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    if (id.toString() === this.components.peerId.toString()) {
      throw new CodeError('Should not try to find self', codes.ERR_FIND_SELF)
    }

    const output = await pipe(
      merge(
        ...this.routers.map(router => (async function * () {
          try {
            yield await router.findPeer(id, options)
          } catch (err) {
            log.error(err)
          }
        })())
      ),
      (source) => filter(source, Boolean),
      (source) => storeAddresses(source, this.components.peerStore),
      async (source) => first(source)
    )

    if (output != null) {
      return output
    }

    throw new CodeError(messages.NOT_FOUND, codes.ERR_NOT_FOUND)
  }

  /**
   * Attempt to find the closest peers on the network to the given key
   */
  async * getClosestPeers (key: Uint8Array, options?: AbortOptions): AsyncIterable<PeerInfo> {
    if (this.routers.length === 0) {
      throw new CodeError('No peer routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    yield * pipe(
      merge(
        ...this.routers.map(router => router.getClosestPeers(key, options))
      ),
      (source) => storeAddresses(source, this.components.peerStore),
      (source) => uniquePeers(source),
      (source) => requirePeers(source)
    )
  }
}
