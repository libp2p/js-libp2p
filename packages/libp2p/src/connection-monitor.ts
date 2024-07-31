import { serviceCapabilities } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import { byteStream } from 'it-byte-stream'
import type { ComponentLogger, Logger, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

const DEFAULT_PING_INTERVAL_MS = 10000
const DEFAULT_PING_TIMEOUT_MS = 2000

export interface ConnectionMonitorInit {
  /**
   * How often to ping remote peers in ms
   *
   * @default 10000
   */
  pingInterval?: number

  /**
   * How long the ping is allowed to take before the connection will be judged
   * inactive and aborted
   *
   * @default 2000
   */
  pingTimeout?: number

  /**
   * If true, any connection that fails the ping will be aborted
   *
   * @default true
   */
  abortConnectionOnPingFailure?: boolean
}

export interface ConnectionMonitorComponents {
  logger: ComponentLogger
  connectionManager: ConnectionManager
}

export class ConnectionMonitor implements Startable {
  private readonly components: ConnectionMonitorComponents
  private readonly log: Logger
  private heartbeatInterval?: ReturnType<typeof setInterval>
  private readonly pingIntervalMs: number
  private readonly pingTimeoutMs: number
  private abortController?: AbortController

  constructor (components: ConnectionMonitorComponents, init: ConnectionMonitorInit = {}) {
    this.components = components

    this.log = components.logger.forComponent('libp2p:connection-monitor')
    this.pingIntervalMs = init.pingInterval ?? DEFAULT_PING_INTERVAL_MS
    this.pingTimeoutMs = init.pingTimeout ?? DEFAULT_PING_TIMEOUT_MS
  }

  readonly [Symbol.toStringTag] = '@libp2p/connection-monitor'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-monitor'
  ]

  start (): void {
    this.abortController = new AbortController()

    this.heartbeatInterval = setInterval(() => {
      this.components.connectionManager.getConnections().forEach(conn => {
        Promise.resolve().then(async () => {
          let start = Date.now()
          try {
            const signal = anySignal([
              this.abortController?.signal,
              AbortSignal.timeout(this.pingTimeoutMs)
            ])
            const stream = await conn.newStream('/ipfs/ping/1.0.0', {
              signal,
              runOnTransientConnection: true
            })
            const bs = byteStream(stream)
            start = Date.now()

            await Promise.all([
              bs.write(new Uint8Array(1), {
                signal
              }),
              bs.read(1, {
                signal
              })
            ])

            conn.rtt = Date.now() - start

            await bs.unwrap().close({
              signal
            })
          } catch (err: any) {
            if (err.code !== 'ERR_UNSUPPORTED_PROTOCOL') {
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
            this.log.error('error during heartbeat, aborting connection', err)
            conn.abort(err)
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
