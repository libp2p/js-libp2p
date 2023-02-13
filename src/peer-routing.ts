import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes, messages } from './errors.js'
import {
  storeAddresses,
  uniquePeers,
  requirePeers
} from './content-routing/utils.js'
import { TimeoutController } from 'timeout-abort-controller'
import merge from 'it-merge'
import { pipe } from 'it-pipe'
import first from 'it-first'
import drain from 'it-drain'
import filter from 'it-filter'
import {
  setDelayedInterval,
  clearDelayedInterval
// @ts-expect-error module with no types
} from 'set-delayed-interval'
import { setMaxListeners } from 'events'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:peer-routing')

export interface RefreshManagerInit {
  /**
   * Whether to enable the Refresh manager
   */
  enabled?: boolean

  /**
   * Boot delay to start the Refresh Manager (in ms)
   */
  bootDelay?: number

  /**
   * Interval between each Refresh Manager run (in ms)
   */
  interval?: number

  /**
   * How long to let each refresh run (in ms)
   */
  timeout?: number
}

export interface PeerRoutingInit {
  routers?: PeerRouting[]
  refreshManager?: RefreshManagerInit
}

export interface DefaultPeerRoutingComponents {
  peerId: PeerId
  peerStore: PeerStore
}

export class DefaultPeerRouting implements PeerRouting, Startable {
  private readonly components: DefaultPeerRoutingComponents
  private readonly routers: PeerRouting[]
  private readonly refreshManagerInit: RefreshManagerInit
  private timeoutId?: ReturnType<typeof setTimeout>
  private started: boolean
  private abortController?: TimeoutController

  constructor (components: DefaultPeerRoutingComponents, init: PeerRoutingInit) {
    this.components = components
    this.routers = init.routers ?? []
    this.refreshManagerInit = init.refreshManager ?? {}
    this.started = false

    this._findClosestPeersTask = this._findClosestPeersTask.bind(this)
  }

  isStarted () {
    return this.started
  }

  /**
   * Start peer routing service.
   */
  async start () {
    if (this.started || this.routers.length === 0 || this.timeoutId != null || this.refreshManagerInit.enabled === false) {
      return
    }

    this.timeoutId = setDelayedInterval(
      this._findClosestPeersTask, this.refreshManagerInit.interval, this.refreshManagerInit.bootDelay
    )

    this.started = true
  }

  /**
   * Recurrent task to find closest peers and add their addresses to the Address Book.
   */
  async _findClosestPeersTask () {
    if (this.abortController != null) {
      // we are already running the query
      return
    }

    try {
      this.abortController = new TimeoutController(this.refreshManagerInit.timeout ?? 10e3)

      // this controller may be used while dialing lots of peers so prevent MaxListenersExceededWarning
      // appearing in the console
      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, this.abortController.signal)
      } catch {}

      // nb getClosestPeers adds the addresses to the address book
      await drain(this.getClosestPeers(this.components.peerId.toBytes(), { signal: this.abortController.signal }))
    } catch (err: any) {
      log.error(err)
    } finally {
      this.abortController?.clear()
      this.abortController = undefined
    }
  }

  /**
   * Stop peer routing service.
   */
  async stop () {
    clearDelayedInterval(this.timeoutId)

    // abort query if it is in-flight
    this.abortController?.abort()

    this.started = false
  }

  /**
   * Iterates over all peer routers in parallel to find the given peer
   */
  async findPeer (id: PeerId, options?: AbortOptions): Promise<PeerInfo> {
    if (this.routers.length === 0) {
      throw errCode(new Error('No peer routers available'), codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    if (id.toString() === this.components.peerId.toString()) {
      throw errCode(new Error('Should not try to find self'), codes.ERR_FIND_SELF)
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
      async (source) => await first(source)
    )

    if (output != null) {
      return output
    }

    throw errCode(new Error(messages.NOT_FOUND), codes.ERR_NOT_FOUND)
  }

  /**
   * Attempt to find the closest peers on the network to the given key
   */
  async * getClosestPeers (key: Uint8Array, options?: AbortOptions): AsyncIterable<PeerInfo> {
    if (this.routers.length === 0) {
      throw errCode(new Error('No peer routers available'), codes.ERR_NO_ROUTERS_AVAILABLE)
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
