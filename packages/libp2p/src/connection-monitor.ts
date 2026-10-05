import { InvalidParametersError, serviceCapabilities } from '@libp2p/interface'
import { byteStream } from '@libp2p/utils'
import { anySignal } from 'any-signal'
import { setMaxListeners } from 'main-event'
import { ConnectionStaleError } from './errors.ts'
import type { ComponentLogger, Connection, Logger, Startable, Stream } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

const DEFAULT_PING_INTERVAL_MS = 10000
const DEFAULT_PING_TIMEOUT_MS = 10000
const DEFAULT_CONNECTION_STALE_TIMEOUT_MS = 60000
const PROTOCOL_VERSION = '1.0.0'
const PROTOCOL_NAME = 'ping'
const PROTOCOL_PREFIX = 'ipfs'
const PING_LENGTH = 32

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
   * How long an individual ping is allowed to take in ms. A failed ping does
   * not abort the connection, that is decided by `connectionStaleTimeout`.
   *
   * @default 10000
   */
  pingTimeout?: number

  /**
   * A connection whose pings have not succeeded for this many ms will be
   * aborted, checked every `pingInterval`. Must be greater than
   * `pingInterval + pingTimeout`. Pass `Infinity` to never abort connections.
   * Connections without a stream muxer are not monitored.
   *
   * @default 60000
   */
  connectionStaleTimeout?: number

  /**
   * Override the ping protocol prefix
   *
   * @default 'ipfs'
   */
  protocolPrefix?: string
}

interface Silence {
  lastActive: number
  idleMs: number
}

export interface ConnectionMonitorComponents {
  logger: ComponentLogger
  connectionManager: ConnectionManager
}

export class ConnectionMonitor implements Startable {
  private readonly protocol: string
  private readonly components: ConnectionMonitorComponents
  private readonly log: Logger
  private heartbeatInterval?: ReturnType<typeof setInterval>
  private readonly pingIntervalMs: number
  private readonly pingTimeoutMs: number
  private readonly connectionStaleTimeoutMs: number
  private abortController?: AbortController
  private readonly pinging = new WeakSet<Connection>()
  private readonly lastPingAt = new WeakMap<Connection, number>()
  private readonly silence = new WeakMap<Connection, Silence>()

  constructor (components: ConnectionMonitorComponents, init: ConnectionMonitorInit = {}) {
    this.components = components
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`

    this.log = components.logger.forComponent('libp2p:connection-monitor')
    this.pingIntervalMs = init.pingInterval ?? DEFAULT_PING_INTERVAL_MS
    this.pingTimeoutMs = init.pingTimeout ?? DEFAULT_PING_TIMEOUT_MS
    this.connectionStaleTimeoutMs = init.connectionStaleTimeout ?? DEFAULT_CONNECTION_STALE_TIMEOUT_MS

    if (!isPositiveFinite(this.pingIntervalMs) || !isPositiveFinite(this.pingTimeoutMs)) {
      throw new InvalidParametersError('pingInterval and pingTimeout must be positive finite numbers')
    }

    // otherwise a peer that answers every ping can still go stale
    if (!(this.connectionStaleTimeoutMs > this.pingIntervalMs + this.pingTimeoutMs)) {
      throw new InvalidParametersError('connectionStaleTimeout must be greater than pingInterval + pingTimeout')
    }
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
        try {
          this.heartbeat(conn)
        } catch (err) {
          this.log.error('heartbeat failed - %e', err)
        }
      })
    }, this.pingIntervalMs)
  }

  stop (): void {
    this.abortController?.abort()

    if (this.heartbeatInterval != null) {
      clearInterval(this.heartbeatInterval)
    }
  }

  private heartbeat (conn: Connection): void {
    // pings need a stream muxer
    if (conn.multiplexer == null) {
      return
    }

    const lastActive = this.lastPingAt.get(conn) ?? conn.timeline.open
    const silence = this.silence.get(conn)
    // silence grows one interval per heartbeat so a pause (sleep, blocked event
    // loop) counts as one interval and peers get pinged before being judged
    // stale. Any change in lastActive resets it, even if the clock went back
    const idleMs = silence == null || lastActive !== silence.lastActive
      ? Math.min(Date.now() - lastActive, this.pingIntervalMs)
      : silence.idleMs + this.pingIntervalMs
    this.silence.set(conn, { lastActive, idleMs })

    if (idleMs > this.connectionStaleTimeoutMs) {
      this.log.error('aborting connection - no successful ping for %dms', idleMs)
      conn.abort(new ConnectionStaleError(`No successful ping for ${idleMs}ms`))
      return
    }

    // the spec allows one outbound ping stream per peer
    if (this.pinging.has(conn) || conn.streams.some(s => s.direction === 'outbound' && s.protocol === this.protocol)) {
      return
    }

    this.pinging.add(conn)

    this.ping(conn)
      .catch(err => {
        this.log('ping failed, connection idle for %dms - %e', idleMs, err)
      })
      .finally(() => {
        this.pinging.delete(conn)
      })
  }

  private async ping (conn: Connection): Promise<void> {
    let start = Date.now()
    const signal = anySignal([
      this.abortController?.signal,
      AbortSignal.timeout(this.pingTimeoutMs)
    ])
    let stream: Stream | undefined

    try {
      stream = await conn.newStream(this.protocol, {
        signal,
        runOnLimitedConnection: true
      })
      const bs = byteStream(stream)
      start = Date.now()

      await Promise.all([
        bs.write(crypto.getRandomValues(new Uint8Array(PING_LENGTH)), {
          signal
        }),
        bs.read({
          bytes: PING_LENGTH,
          signal
        })
      ])

      conn.rtt = Date.now() - start
      this.lastPingAt.set(conn, Date.now())

      // the ping succeeded even if closing the stream fails
      await stream.close({
        signal
      }).catch((err: Error) => {
        stream?.abort(err)
      })
    } catch (err: any) {
      stream?.abort(err)

      if (err.name !== 'UnsupportedProtocolError') {
        throw err
      }

      // protocol was unsupported, but that's ok as it means the remote
      // peer was still alive. We ran multistream-select which means two
      // round trips (e.g. 1x for the mss header, then another for the
      // protocol) so divide the time it took by two
      conn.rtt = (Date.now() - start) / 2
      this.lastPingAt.set(conn, Date.now())
    } finally {
      signal.clear()
    }
  }
}

function isPositiveFinite (n: number): boolean {
  return Number.isFinite(n) && n > 0
}
