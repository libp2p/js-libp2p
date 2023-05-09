import { setMaxListeners } from 'events'
import { logger, type Logger } from '@libp2p/logger'
import { anySignal } from 'any-signal'
import length from 'it-length'
import { pipe } from 'it-pipe'
import take from 'it-take'
import { QUERY_SELF_INTERVAL, QUERY_SELF_TIMEOUT, K, QUERY_SELF_INITIAL_INTERVAL } from './constants.js'
import type { KadDHTComponents } from './index.js'
import type { PeerRouting } from './peer-routing/index.js'
import type { RoutingTable } from './routing-table/index.js'
import type { Startable } from '@libp2p/interfaces/startable'
import type { DeferredPromise } from 'p-defer'

export interface QuerySelfInit {
  lan: boolean
  peerRouting: PeerRouting
  routingTable: RoutingTable
  count?: number
  interval?: number
  initialInterval?: number
  queryTimeout?: number
  initialQuerySelfHasRun: DeferredPromise<void>
}

function debounce (func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return function () {
    const later = function (): void {
      timeout = undefined
      func()
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class QuerySelf implements Startable {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly peerRouting: PeerRouting
  private readonly routingTable: RoutingTable
  private readonly count: number
  private readonly interval: number
  private readonly initialInterval: number
  private readonly queryTimeout: number
  private started: boolean
  private running: boolean
  private timeoutId?: NodeJS.Timer
  private controller?: AbortController
  private initialQuerySelfHasRun?: DeferredPromise<void>

  constructor (components: KadDHTComponents, init: QuerySelfInit) {
    const { peerRouting, lan, count, interval, queryTimeout, routingTable } = init

    this.components = components
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:query-self`)
    this.running = false
    this.started = false
    this.peerRouting = peerRouting
    this.routingTable = routingTable
    this.count = count ?? K
    this.interval = interval ?? QUERY_SELF_INTERVAL
    this.initialInterval = init.initialInterval ?? QUERY_SELF_INITIAL_INTERVAL
    this.queryTimeout = queryTimeout ?? QUERY_SELF_TIMEOUT
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun

    this.querySelf = debounce(this.querySelf.bind(this), 100)
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true
    clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(this.querySelf.bind(this), this.initialInterval)
  }

  async stop (): Promise<void> {
    this.started = false

    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId)
    }

    if (this.controller != null) {
      this.controller.abort()
    }
  }

  querySelf (): void {
    if (!this.started) {
      this.log('skip self-query because we are not started')
      return
    }

    if (this.running) {
      this.log('skip self-query because we are already running, will run again in %dms', this.interval)
      return
    }

    if (this.routingTable.size === 0) {
      let nextInterval = this.interval

      if (this.initialQuerySelfHasRun != null) {
        // if we've not yet run the first self query, shorten the interval until we try again
        nextInterval = this.initialInterval
      }

      this.log('skip self-query because routing table is empty, will run again in %dms', nextInterval)
      clearTimeout(this.timeoutId)
      this.timeoutId = setTimeout(this.querySelf.bind(this), nextInterval)
      return
    }

    this.running = true

    Promise.resolve()
      .then(async () => {
        if (!this.started) {
          this.log('not running self-query - node stopped before query started')
          return
        }

        this.controller = new AbortController()
        const signal = anySignal([this.controller.signal, AbortSignal.timeout(this.queryTimeout)])

        // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
        try {
          if (setMaxListeners != null) {
            setMaxListeners(Infinity, signal)
          }
        } catch {} // fails on node < 15.4

        try {
          this.log('run self-query, look for %d peers timing out after %dms', this.count, this.queryTimeout)

          const found = await pipe(
            this.peerRouting.getClosestPeers(this.components.peerId.toBytes(), {
              signal,
              isSelfQuery: true
            }),
            (source) => take(source, this.count),
            async (source) => length(source)
          )

          this.log('self-query ran successfully - found %d peers', found)

          if (this.initialQuerySelfHasRun != null) {
            this.initialQuerySelfHasRun.resolve()
            this.initialQuerySelfHasRun = undefined
          }
        } catch (err: any) {
          this.log.error('self-query error', err)
        } finally {
          signal.clear()
        }
      }).catch(err => {
        this.log('self-query error', err)
      }).finally(() => {
        this.running = false

        clearTimeout(this.timeoutId)

        if (this.started) {
          this.log('running self-query again in %dms', this.interval)
          this.timeoutId = setTimeout(this.querySelf.bind(this), this.interval)
        }
      })
  }
}
