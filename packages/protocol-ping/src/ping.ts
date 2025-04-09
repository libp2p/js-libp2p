import { randomBytes } from '@libp2p/crypto'
import { ProtocolError, TimeoutError, serviceCapabilities, setMaxListeners } from '@libp2p/interface'
import { byteStream } from 'it-byte-stream'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { PingComponents, PingInit, Ping as PingInterface } from './index.js'
import type { AbortOptions, Logger, Stream, PeerId, Startable, IncomingStreamData } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class Ping implements Startable, PingInterface {
  public readonly protocol: string
  private readonly components: PingComponents
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnLimitedConnection: boolean
  private readonly log: Logger

  constructor (components: PingComponents, init: PingInit = {}) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:ping')
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? true

    this.handleMessage = this.handleMessage.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/ping'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/ping'
  ]

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
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
  handleMessage (data: IncomingStreamData): void {
    this.log('incoming ping from %p', data.connection.remotePeer)

    const { stream } = data
    const start = Date.now()
    const bytes = byteStream(stream)
    let pinged = false

    Promise.resolve().then(async () => {
      while (true) {
        const signal = AbortSignal.timeout(this.timeout)
        setMaxListeners(Infinity, signal)
        signal.addEventListener('abort', () => {
          stream?.abort(new TimeoutError('ping timeout'))
        })

        const buf = await bytes.read({
          bytes: PING_LENGTH,
          signal
        })
        await bytes.write(buf, {
          signal
        })

        pinged = true
      }
    })
      .catch(err => {
        // ignore the error if we've processed at least one ping, the remote
        // closed the stream and we handled or are handling the close cleanly
        if (pinged && err.name === 'UnexpectedEOFError' && stream.readStatus !== 'ready') {
          return
        }

        this.log.error('incoming ping from %p failed with error - %e', data.connection.remotePeer, err)
        stream?.abort(err)
      })
      .finally(() => {
        const ms = Date.now() - start
        this.log('incoming ping from %p complete in %dms', data.connection.remotePeer, ms)

        const signal = AbortSignal.timeout(this.timeout)
        setMaxListeners(Infinity, signal)

        stream.close({
          signal
        })
          .catch(err => {
            this.log.error('error closing ping stream from %p - %e', data.connection.remotePeer, err)
            stream?.abort(err)
          })
      })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   */
  async ping (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<number> {
    this.log('pinging %p', peer)

    const start = Date.now()
    const data = randomBytes(PING_LENGTH)
    const connection = await this.components.connectionManager.openConnection(peer, options)
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

      if (!uint8ArrayEquals(data, result.subarray())) {
        throw new ProtocolError(`Received wrong ping ack after ${ms}ms`)
      }

      this.log('ping %p complete in %dms', connection.remotePeer, ms)

      return ms
    } catch (err: any) {
      this.log.error('error while pinging %p', connection.remotePeer, err)

      stream?.abort(err)

      throw err
    } finally {
      if (stream != null) {
        await stream.close(options)
      }
    }
  }
}
