/**
 * This code is based on `latency-monitor` (https://github.com/mlucool/latency-monitor) by `mlucool` (https://github.com/mlucool), available under Apache License 2.0 (https://github.com/mlucool/latency-monitor/blob/master/LICENSE)
 */

import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { VisibilityChangeEmitter } from './visibility-change-emitter.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:connection-manager:latency-monitor')

export interface LatencyMonitorEvents {
  'data': CustomEvent<SummaryObject>
}

export interface LatencyMonitorInit {
  /**
   * How often to add a latency check event (ms)
   */
  latencyCheckIntervalMs?: number

  /**
   * How often to summarize latency check events. null or 0 disables event firing
   */
  dataEmitIntervalMs?: number

  /**
   * What cb-style async function to use
   */
  asyncTestFn?: (cb: () => void) => void

  /**
   * What percent (+/-) of latencyCheckIntervalMs should we randomly use? This helps avoid alignment to other events.
   */
  latencyRandomPercentage?: number
}

export interface SummaryObject {
  /**
   * How many events were called
   */
  events: number

  /**
   * What was the min time for a cb to be called
   */
  minMs: number

  /**
   * What was the max time for a cb to be called
   */
  maxMs: number

  /**
   * What was the average time for a cb to be called
   */
  avgMs: number

  /**
   * How long this interval was in ms
   */
  lengthMs: number
}

interface LatencyData {
  startTime: number
  events: number
  minMs: number
  maxMs: number
  totalMs: number
}

/**
 * A class to monitor latency of any async function which works in a browser or node. This works by periodically calling
 * the asyncTestFn and timing how long it takes the callback to be called. It can also periodically emit stats about this.
 * This can be disabled and stats can be pulled via setting dataEmitIntervalMs = 0.
 *
 * @extends {EventEmitter}
 *
 * The default implementation is an event loop latency monitor. This works by firing periodic events into the event loop
 * and timing how long it takes to get back.
 *
 * @example
 * const monitor = new LatencyMonitor();
 * monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
 *
 * @example
 * const monitor = new LatencyMonitor({latencyCheckIntervalMs: 1000, dataEmitIntervalMs: 60000, asyncTestFn:ping});
 * monitor.on('data', (summary) => console.log('Ping Pong Latency: %O', summary));
 */
export class LatencyMonitor extends EventEmitter<LatencyMonitorEvents> {
  private readonly latencyCheckIntervalMs: number
  private readonly latencyRandomPercentage: number
  private readonly latencyCheckMultiply: number
  private readonly latencyCheckSubtract: number
  private readonly dataEmitIntervalMs?: number
  private readonly asyncTestFn?: (cb: () => void) => void

  private readonly now: (num?: any) => any
  private readonly getDeltaMS: (num: number) => number
  private visibilityChangeEmitter?: VisibilityChangeEmitter
  private latencyData: LatencyData
  private checkLatencyID?: NodeJS.Timeout
  private emitIntervalID?: NodeJS.Timeout

  constructor (init: LatencyMonitorInit = {}) {
    super()

    const { latencyCheckIntervalMs, dataEmitIntervalMs, asyncTestFn, latencyRandomPercentage } = init

    // 0 isn't valid here, so its ok to use ||
    this.latencyCheckIntervalMs = latencyCheckIntervalMs ?? 500 // 0.5s
    this.latencyRandomPercentage = latencyRandomPercentage ?? 10
    this.latencyCheckMultiply = 2 * (this.latencyRandomPercentage / 100.0) * this.latencyCheckIntervalMs
    this.latencyCheckSubtract = this.latencyCheckMultiply / 2

    this.dataEmitIntervalMs = (dataEmitIntervalMs === null || dataEmitIntervalMs === 0)
      ? undefined
      : dataEmitIntervalMs ?? 5 * 1000 // 5s
    log('latencyCheckIntervalMs: %s dataEmitIntervalMs: %s',
      this.latencyCheckIntervalMs, this.dataEmitIntervalMs)
    if (this.dataEmitIntervalMs != null) {
      log('Expecting ~%s events per summary', this.latencyCheckIntervalMs / this.dataEmitIntervalMs)
    } else {
      log('Not emitting summaries')
    }

    this.asyncTestFn = asyncTestFn // If there is no asyncFn, we measure latency

    // If process: use high resolution timer
    if (globalThis.process?.hrtime != null) {
      log('Using process.hrtime for timing')
      this.now = globalThis.process.hrtime // eslint-disable-line no-undef
      this.getDeltaMS = (startTime) => {
        const hrtime = this.now(startTime)
        return (hrtime[0] * 1000) + (hrtime[1] / 1000000)
      }
      // Let's try for a timer that only monotonically increases
    } else if (typeof window !== 'undefined' && window.performance?.now != null) {
      log('Using performance.now for timing')
      this.now = window.performance.now.bind(window.performance)
      this.getDeltaMS = (startTime) => Math.round(this.now() - startTime)
    } else {
      log('Using Date.now for timing')
      this.now = Date.now
      this.getDeltaMS = (startTime) => this.now() - startTime
    }

    this.latencyData = this.initLatencyData()
  }

  start () {
    // We check for isBrowser because of browsers set max rates of timeouts when a page is hidden,
    // so we fall back to another library
    // See: http://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs
    if (isBrowser()) {
      this.visibilityChangeEmitter = new VisibilityChangeEmitter()

      this.visibilityChangeEmitter.addEventListener('visibilityChange', (evt) => {
        const { detail: pageInFocus } = evt

        if (pageInFocus) {
          this._startTimers()
        } else {
          this._emitSummary()
          this._stopTimers()
        }
      })
    }

    if (this.visibilityChangeEmitter?.isVisible() === true) {
      this._startTimers()
    }
  }

  stop () {
    this._stopTimers()
  }

  /**
   * Start internal timers
   *
   * @private
   */
  _startTimers () {
    // Timer already started, ignore this
    if (this.checkLatencyID != null) {
      return
    }

    this.checkLatency()

    if (this.dataEmitIntervalMs != null) {
      this.emitIntervalID = setInterval(() => this._emitSummary(), this.dataEmitIntervalMs)
      if (typeof this.emitIntervalID.unref === 'function') {
        this.emitIntervalID.unref() // Doesn't block exit
      }
    }
  }

  /**
   * Stop internal timers
   *
   * @private
   */
  _stopTimers () {
    if (this.checkLatencyID != null) {
      clearTimeout(this.checkLatencyID)
      this.checkLatencyID = undefined
    }
    if (this.emitIntervalID != null) {
      clearInterval(this.emitIntervalID)
      this.emitIntervalID = undefined
    }
  }

  /**
   * Emit summary only if there were events. It might not have any events if it was forced via a page hidden/show
   *
   * @private
   */
  _emitSummary () {
    const summary = this.getSummary()
    if (summary.events > 0) {
      this.dispatchEvent(new CustomEvent<SummaryObject>('data', {
        detail: summary
      }))
    }
  }

  /**
   * Calling this function will end the collection period. If a timing event was already fired and somewhere in the queue,
   * it will not count for this time period
   */
  getSummary (): SummaryObject {
    // We might want to adjust for the number of expected events
    // Example: first 1 event it comes back, then such a long blocker that the next emit check comes
    // Then this fires - looks like no latency!!
    const latency = {
      events: this.latencyData.events,
      minMs: this.latencyData.minMs,
      maxMs: this.latencyData.maxMs,
      avgMs: this.latencyData.events > 0
        ? this.latencyData.totalMs / this.latencyData.events
        : Number.POSITIVE_INFINITY,
      lengthMs: this.getDeltaMS(this.latencyData.startTime)
    }
    this.latencyData = this.initLatencyData() // Clear

    log.trace('Summary: %O', latency)
    return latency
  }

  /**
   * Randomly calls an async fn every roughly latencyCheckIntervalMs (plus some randomness). If no async fn is found,
   * it will simply report on event loop latency.
   */
  checkLatency () {
    // Randomness is needed to avoid alignment by accident to regular things in the event loop
    const randomness = (Math.random() * this.latencyCheckMultiply) - this.latencyCheckSubtract

    // We use this to ensure that in case some overlap somehow, we don't take the wrong startTime/offset
    const localData = {
      deltaOffset: Math.ceil(this.latencyCheckIntervalMs + randomness),
      startTime: this.now()
    }

    const cb = () => {
      // We are already stopped, ignore this datapoint
      if (this.checkLatencyID == null) {
        return
      }
      const deltaMS = this.getDeltaMS(localData.startTime) - localData.deltaOffset
      this.checkLatency() // Start again ASAP

      // Add the data point. If this gets complex, refactor it
      this.latencyData.events++
      this.latencyData.minMs = Math.min(this.latencyData.minMs, deltaMS)
      this.latencyData.maxMs = Math.max(this.latencyData.maxMs, deltaMS)
      this.latencyData.totalMs += deltaMS
      log.trace('MS: %s Data: %O', deltaMS, this.latencyData)
    }
    log.trace('localData: %O', localData)

    this.checkLatencyID = setTimeout(() => {
      // This gets rid of including event loop
      if (this.asyncTestFn != null) {
        // Clear timing related things
        localData.deltaOffset = 0
        localData.startTime = this.now()
        this.asyncTestFn(cb)
      } else {
        // setTimeout is not more accurate than 1ms, so this will ensure positive numbers. Add 1 to emitted data to remove.
        // This is not the best, but for now it'll be just fine. This isn't meant to be sub ms accurate.
        localData.deltaOffset -= 1
        // If there is no function to test, we mean check latency which is a special case that is really cb => cb()
        // We avoid that for the few extra function all overheads. Also, we want to keep the timers different
        cb()
      }
    }, localData.deltaOffset)

    if (typeof this.checkLatencyID.unref === 'function') {
      this.checkLatencyID.unref() // Doesn't block exit
    }
  }

  initLatencyData (): LatencyData {
    return {
      startTime: this.now(),
      minMs: Number.POSITIVE_INFINITY,
      maxMs: Number.NEGATIVE_INFINITY,
      events: 0,
      totalMs: 0
    }
  }
}

function isBrowser () {
  return typeof globalThis.window !== 'undefined'
}
