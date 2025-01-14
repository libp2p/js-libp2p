import { setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import length from 'it-length'
import { pipe } from 'it-pipe'
import take from 'it-take'
import pDefer from 'p-defer'
import { pEvent } from 'p-event'
import { QUERY_SELF_INTERVAL, QUERY_SELF_TIMEOUT, K, QUERY_SELF_INITIAL_INTERVAL } from './constants.js'
import { timeOperationMethod } from './utils.js'
import type { OperationMetrics } from './kad-dht.js'
import type { PeerRouting } from './peer-routing/index.js'
import type { RoutingTable } from './routing-table/index.js'
import type { ComponentLogger, Logger, Metrics, PeerId, Startable } from '@libp2p/interface'
import type { DeferredPromise } from 'p-defer'
export interface QuerySelfInit {
  logPrefix: string
  peerRouting: PeerRouting
  routingTable: RoutingTable
  count?: number
  interval?: number
  initialInterval?: number
  queryTimeout?: number
  initialQuerySelfHasRun: DeferredPromise<void>
  operationMetrics: OperationMetrics
}

export interface QuerySelfComponents {
  peerId: PeerId
  logger: ComponentLogger
  metrics?: Metrics
}

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class QuerySelf implements Startable {
  private readonly log: Logger
  private readonly peerId: PeerId
  private readonly peerRouting: PeerRouting
  private readonly routingTable: RoutingTable
  private readonly count: number
  private readonly interval: number
  private readonly initialInterval: number
  private readonly queryTimeout: number
  private running: boolean
  private timeoutId?: ReturnType<typeof setTimeout>
  private controller?: AbortController
  private initialQuerySelfHasRun?: DeferredPromise<void>
  private querySelfPromise?: DeferredPromise<void>

  constructor (components: QuerySelfComponents, init: QuerySelfInit) {
    this.peerId = components.peerId
    this.log = components.logger.forComponent(`${init.logPrefix}:query-self`)
    this.running = false
    this.peerRouting = init.peerRouting
    this.routingTable = init.routingTable
    this.count = init.count ?? K
    this.interval = init.interval ?? QUERY_SELF_INTERVAL
    this.initialInterval = init.initialInterval ?? QUERY_SELF_INITIAL_INTERVAL
    this.queryTimeout = init.queryTimeout ?? QUERY_SELF_TIMEOUT
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun

    this.querySelf = timeOperationMethod(this.querySelf.bind(this), init.operationMetrics, 'SELF_QUERY')
  }

  isStarted (): boolean {
    return this.running
  }

  start (): void {
    if (this.running) {
      return
    }

    this.running = true
    clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => {
      this.querySelf()
        .catch(err => {
          this.log.error('error running self-query', err)
        })
    }, this.initialInterval)
  }

  stop (): void {
    this.running = false

    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId)
    }

    if (this.controller != null) {
      this.controller.abort()
    }
  }

  async querySelf (): Promise<void> {
    if (!this.running) {
      this.log('skip self-query because we are not started')
      return
    }

    if (this.querySelfPromise != null) {
      this.log('joining existing self query')
      return this.querySelfPromise.promise
    }

    this.querySelfPromise = pDefer()

    if (this.running) {
      this.controller = new AbortController()
      const signals = [this.controller.signal]

      // add a shorter timeout if we've already run our initial self query
      if (this.initialQuerySelfHasRun == null) {
        const timeoutSignal = AbortSignal.timeout(this.queryTimeout)
        setMaxListeners(Infinity, timeoutSignal)
        signals.push(timeoutSignal)
      }

      const signal = anySignal(signals)
      setMaxListeners(Infinity, signal, this.controller.signal)

      try {
        if (this.routingTable.size === 0) {
          this.log('routing table was empty, waiting for some peers before running query')
          // wait to discover at least one DHT peer that isn't us
          await pEvent(this.routingTable, 'peer:add', {
            signal,
            filter: (event) => !this.peerId.equals(event.detail)
          })
          this.log('routing table has peers, continuing with query')
        }

        this.log('run self-query, look for %d peers timing out after %dms', this.count, this.queryTimeout)
        const start = Date.now()

        const found = await pipe(
          this.peerRouting.getClosestPeers(this.peerId.toMultihash().bytes, {
            signal,
            isSelfQuery: true
          }),
          (source) => take(source, this.count),
          async (source) => length(source)
        )

        this.log('self-query found %d peers in %dms', found, Date.now() - start)
      } catch (err: any) {
        this.log.error('self-query error', err)
      } finally {
        signal.clear()

        if (this.initialQuerySelfHasRun != null) {
          this.initialQuerySelfHasRun.resolve()
          this.initialQuerySelfHasRun = undefined
        }
      }
    }

    this.querySelfPromise.resolve()
    this.querySelfPromise = undefined

    if (!this.running) {
      return
    }

    this.timeoutId = setTimeout(() => {
      this.querySelf()
        .catch(err => {
          this.log.error('error running self-query', err)
        })
    }, this.interval)
  }
}
