import { setMaxListeners } from 'events'
import take from 'it-take'
import length from 'it-length'
import { QUERY_SELF_INTERVAL, QUERY_SELF_TIMEOUT, K } from './constants.js'
import { TimeoutController } from 'timeout-abort-controller'
import { anySignal } from 'any-signal'
import { logger, Logger } from '@libp2p/logger'
import type { PeerRouting } from './peer-routing/index.js'
import type { Startable } from '@libp2p/interfaces/startable'
import { pipe } from 'it-pipe'
import { Components, Initializable } from '@libp2p/components'

export interface QuerySelfInit {
  lan: boolean
  peerRouting: PeerRouting
  count?: number
  interval?: number
  queryTimeout?: number
}

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class QuerySelf implements Startable, Initializable {
  private readonly log: Logger
  private components: Components = new Components()
  private readonly peerRouting: PeerRouting
  private readonly count: number
  private readonly interval: number
  private readonly queryTimeout: number
  private running: boolean
  private timeoutId?: NodeJS.Timer
  private controller?: AbortController

  constructor (init: QuerySelfInit) {
    const { peerRouting, lan, count, interval, queryTimeout } = init

    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:query-self`)
    this.running = false
    this.peerRouting = peerRouting
    this.count = count ?? K
    this.interval = interval ?? QUERY_SELF_INTERVAL
    this.queryTimeout = queryTimeout ?? QUERY_SELF_TIMEOUT
  }

  init (components: Components): void {
    this.components = components
  }

  isStarted () {
    return this.running
  }

  async start () {
    if (this.running) {
      return
    }

    this.running = true
    this._querySelf()
  }

  async stop () {
    this.running = false

    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId)
    }

    if (this.controller != null) {
      this.controller.abort()
    }
  }

  _querySelf () {
    Promise.resolve().then(async () => {
      const timeoutController = new TimeoutController(this.queryTimeout)

      try {
        this.controller = new AbortController()
        const signal = anySignal([this.controller.signal, timeoutController.signal])
        // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
        try {
          if (setMaxListeners != null) {
            setMaxListeners(Infinity, signal)
          }
        } catch {} // fails on node < 15.4
        const found = await pipe(
          this.peerRouting.getClosestPeers(this.components.getPeerId().toBytes(), {
            signal
          }),
          (source) => take(source, this.count),
          async (source) => await length(source)
        )

        this.log('query ran successfully - found %d peers', found)
      } catch (err: any) {
        this.log('query error', err)
      } finally {
        this.timeoutId = setTimeout(this._querySelf.bind(this), this.interval)
        timeoutController.clear()
      }
    }).catch(err => {
      this.log('query error', err)
    })
  }
}
