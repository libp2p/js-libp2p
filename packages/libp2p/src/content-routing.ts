import { CodeError } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import merge from 'it-merge'
import { codes, messages } from './errors.js'
import type { AbortOptions, ComponentLogger, ContentRouting, PeerInfo, PeerRouting, PeerStore, RoutingOptions, Startable } from '@libp2p/interface'
import type { CID } from 'multiformats/cid'

export interface CompoundContentRoutingInit {
  routers: ContentRouting[]
}

export interface CompoundContentRoutingComponents {
  peerStore: PeerStore
  peerRouting: PeerRouting
  logger: ComponentLogger
}

export class CompoundContentRouting implements ContentRouting, Startable {
  private readonly routers: ContentRouting[]
  private started: boolean
  private readonly components: CompoundContentRoutingComponents

  constructor (components: CompoundContentRoutingComponents, init: CompoundContentRoutingInit) {
    this.routers = init.routers ?? []
    this.started = false
    this.components = components
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    this.started = true
  }

  async stop (): Promise<void> {
    this.started = false
  }

  /**
   * Iterates over all content routers in parallel to find providers of the given key
   */
  async * findProviders (key: CID, options: RoutingOptions = {}): AsyncIterable<PeerInfo> {
    if (this.routers.length === 0) {
      throw new CodeError('No content routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    const self = this
    const seen = new PeerSet()

    for await (const peer of merge(
      ...self.routers.map(router => router.findProviders(key, options))
    )) {
      // the peer was yielded by a content router without multiaddrs and we
      // failed to load them
      if (peer == null) {
        continue
      }

      // store the addresses for the peer if found
      if (peer.multiaddrs.length > 0) {
        await this.components.peerStore.merge(peer.id, {
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

  /**
   * Iterates over all content routers in parallel to notify it is
   * a provider of the given key
   */
  async provide (key: CID, options: AbortOptions = {}): Promise<void> {
    if (this.routers.length === 0) {
      throw new CodeError('No content routers available', codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    await Promise.all(this.routers.map(async (router) => {
      await router.provide(key, options)
    }))
  }

  /**
   * Store the given key/value pair in the available content routings
   */
  async put (key: Uint8Array, value: Uint8Array, options?: AbortOptions): Promise<void> {
    if (!this.isStarted()) {
      throw new CodeError(messages.NOT_STARTED_YET, codes.ERR_NODE_NOT_STARTED)
    }

    await Promise.all(this.routers.map(async (router) => {
      await router.put(key, value, options)
    }))
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute by default.
   */
  async get (key: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    if (!this.isStarted()) {
      throw new CodeError(messages.NOT_STARTED_YET, codes.ERR_NODE_NOT_STARTED)
    }

    return Promise.any(this.routers.map(async (router) => {
      return router.get(key, options)
    }))
  }
}
