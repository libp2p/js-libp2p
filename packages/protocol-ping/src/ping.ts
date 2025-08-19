import { randomBytes } from '@libp2p/crypto'
import { ProtocolError, serviceCapabilities } from '@libp2p/interface'
import { byteStream } from '@libp2p/utils'
import { setMaxListeners } from 'main-event'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { PingComponents, PingInit, Ping as PingInterface } from './index.js'
import type { AbortOptions, Stream, PeerId, Startable, Connection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class Ping implements Startable, PingInterface {
  public readonly protocol: string
  private readonly components: PingComponents
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnLimitedConnection: boolean

  constructor (components: PingComponents, init: PingInit = {}) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? true

    this.handlePing = this.handlePing.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/ping'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/ping'
  ]

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handlePing, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
    })
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * A handler to register with Libp2p to process ping messages
   */
  async handlePing (stream: Stream, connection: Connection): Promise<void> {
    const log = stream.log.newScope('ping')
    log.trace('ping from %p', connection.remotePeer)

    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)

    const start = Date.now()
    const bytes = byteStream(stream)

    while (stream.readStatus === 'readable') {
      const buf = await bytes.read({
        bytes: PING_LENGTH,
        signal
      })
      await bytes.write(buf, {
        signal
      })

      log('ping from %p complete in %dms', connection.remotePeer, Date.now() - start)
    }

    await stream.closeWrite({
      signal
    })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   */
  async ping (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<number> {
    const start = Date.now()
    const data = randomBytes(PING_LENGTH)
    const connection = await this.components.connectionManager.openConnection(peer, options)
    const log = connection.log.newScope('ping')
    let stream: Stream | undefined

    if (options.signal == null) {
      const signal = AbortSignal.timeout(this.timeout)

      options = {
        ...options,
        signal
      }
    }

    try {
      stream = await connection.newStream(this.protocol, {
        ...options,
        runOnLimitedConnection: this.runOnLimitedConnection
      })

      const bytes = byteStream(stream)

      const [, result] = await Promise.all([
        bytes.write(data, options),
        bytes.read({
          ...options,
          bytes: PING_LENGTH
        })
      ])

      const ms = Date.now() - start

      stream.closeWrite()

      if (!uint8ArrayEquals(data, result.subarray())) {
        throw new ProtocolError(`Received wrong ping ack after ${ms}ms`)
      }

      log('ping %p complete in %dms', connection.remotePeer, ms)

      return ms
    } catch (err: any) {
      log.error('error while pinging %p', connection.remotePeer, err)

      stream?.abort(err)

      throw err
    } finally {
      stream?.closeWrite()
    }
  }
}
