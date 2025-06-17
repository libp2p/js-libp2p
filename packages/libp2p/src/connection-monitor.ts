import { randomBytes } from '@libp2p/crypto'
import { serviceCapabilities } from '@libp2p/interface'
import { AdaptiveTimeout } from '@libp2p/utils/adaptive-timeout'
import { byteStream } from 'it-byte-stream'
import { setMaxListeners } from 'main-event'
import type { ComponentLogger, Logger, Metrics, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { AdaptiveTimeoutInit } from '@libp2p/utils/adaptive-timeout'

const DEFAULT_PING_INTERVAL_MS = 10000
const PROTOCOL_VERSION = '1.0.0'
const PROTOCOL_NAME = 'ping'
const PROTOCOL_PREFIX = 'ipfs'
const PING_LENGTH = 32
const DEFAULT_ABORT_CONNECTION_ON_PING_FAILURE = true

export interface ConnectionMonitorInit {
  /**
   * Whether the connection monitor is enabled
   *
   * @default true
   */
  enabled?: boolean

  /**
   * How often to ping remote peers in ms
   *
   * @default 10000
   */
  pingInterval?: number

  /**
   * Timeout settings for how long the ping is allowed to take before the
   * connection will be judged inactive and aborted.
   *
   * The timeout is adaptive to cope with slower networks or nodes that
   * have changing network characteristics, such as mobile.
   */
  pingTimeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>

  /**
   * If true, any connection that fails the ping will be aborted
   *
   * @default true
   */
  abortConnectionOnPingFailure?: boolean

  /**
   * Override the ping protocol prefix
   *
   * @default 'ipfs'
   */
  protocolPrefix?: string
}

export interface ConnectionMonitorComponents {
  logger: ComponentLogger
  connectionManager: ConnectionManager
  metrics?: Metrics
}

export class ConnectionMonitor implements Startable {
  private readonly protocol: string
  private readonly components: ConnectionMonitorComponents
  private readonly log: Logger
  private heartbeatInterval?: ReturnType<typeof setInterval>
  private readonly pingIntervalMs: number
  private abortController?: AbortController
  private readonly timeout: AdaptiveTimeout
  private readonly abortConnectionOnPingFailure: boolean

  constructor (components: ConnectionMonitorComponents, init: ConnectionMonitorInit = {}) {
    this.components = components
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`

    this.log = components.logger.forComponent('libp2p:connection-monitor')
    this.pingIntervalMs = init.pingInterval ?? DEFAULT_PING_INTERVAL_MS
    this.abortConnectionOnPingFailure = init.abortConnectionOnPingFailure ?? DEFAULT_ABORT_CONNECTION_ON_PING_FAILURE
    this.timeout = new AdaptiveTimeout({
      ...(init.pingTimeout ?? {}),
      metrics: components.metrics,
      metricName: 'libp2p_connection_monitor_ping_time_milliseconds'
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/connection-monitor'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-monitor'
  ]

  start (): void {
    this.abortController = new AbortController()
    setMaxListeners(Infinity, this.abortController.signal)

    this.heartbeatInterval = setInterval(() => {
      this.components.connectionManager.getConnections().forEach(conn => {
        Promise.resolve().then(async () => {
          let start = Date.now()
          try {
            const signal = this.timeout.getTimeoutSignal({
              signal: this.abortController?.signal
            })
            const stream = await conn.newStream(this.protocol, {
              signal,
              runOnLimitedConnection: true
            })
            const bs = byteStream(stream)
            start = Date.now()

            await Promise.all([
              bs.write(randomBytes(PING_LENGTH), {
                signal
              }),
              bs.read({
                bytes: PING_LENGTH,
                signal
              })
            ])

            conn.rtt = Date.now() - start

            await bs.unwrap().close({
              signal
            })
          } catch (err: any) {
            if (err.name !== 'UnsupportedProtocolError') {
              throw err
            }

            // protocol was unsupported, but that's ok as it means the remote
            // peer was still alive. We ran multistream-select which means two
            // round trips (e.g. 1x for the mss header, then another for the
            // protocol) so divide the time it took by two
            conn.rtt = (Date.now() - start) / 2
          }
        })
          .catch(err => {
            this.log.error('error during heartbeat', err)

            if (this.abortConnectionOnPingFailure) {
              this.log.error('aborting connection due to ping failure')
              conn.abort(err)
            } else {
              this.log('connection ping failed, but not aborting due to abortConnectionOnPingFailure flag')
            }
          })
      })
    }, this.pingIntervalMs)
  }

  stop (): void {
    this.abortController?.abort()

    if (this.heartbeatInterval != null) {
      clearInterval(this.heartbeatInterval)
    }
  }
}
