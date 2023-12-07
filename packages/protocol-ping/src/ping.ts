import { randomBytes } from '@libp2p/crypto'
import { CodeError, ERR_TIMEOUT } from '@libp2p/interface'
import first from 'it-first'
import { pipe } from 'it-pipe'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS, ERR_WRONG_PING_ACK } from './constants.js'
import type { PingServiceComponents, PingServiceInit, PingService as PingServiceInterface } from './index.js'
import type { AbortOptions, Logger, Stream, PeerId, Startable } from '@libp2p/interface'
import type { IncomingStreamData } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export class PingService implements Startable, PingServiceInterface {
  public readonly protocol: string
  private readonly components: PingServiceComponents
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnTransientConnection: boolean
  private readonly log: Logger

  constructor (components: PingServiceComponents, init: PingServiceInit = {}) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:ping')
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnTransientConnection = init.runOnTransientConnection ?? true

    this.handleMessage = this.handleMessage.bind(this)
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnTransientConnection: this.runOnTransientConnection
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

    void pipe(stream, stream)
      .catch(err => {
        this.log.error('incoming ping from %p failed with error', data.connection.remotePeer, err)
      })
      .finally(() => {
        const ms = Date.now() - start

        this.log('incoming ping from %p complete in %dms', data.connection.remotePeer, ms)
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
    let onAbort = (): void => {}

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
        runOnTransientConnection: this.runOnTransientConnection
      })

      onAbort = () => {
        stream?.abort(new CodeError('ping timeout', ERR_TIMEOUT))
      }

      // make stream abortable
      options.signal?.addEventListener('abort', onAbort, { once: true })

      const result = await pipe(
        [data],
        stream,
        async (source) => first(source)
      )

      const ms = Date.now() - start

      if (result == null) {
        throw new CodeError(`Did not receive a ping ack after ${ms}ms`, ERR_WRONG_PING_ACK)
      }

      if (!uint8ArrayEquals(data, result.subarray())) {
        throw new CodeError(`Received wrong ping ack after ${ms}ms`, ERR_WRONG_PING_ACK)
      }

      this.log('ping %p complete in %dms', connection.remotePeer, ms)

      return ms
    } catch (err: any) {
      this.log.error('error while pinging %p', connection.remotePeer, err)

      stream?.abort(err)

      throw err
    } finally {
      options.signal?.removeEventListener('abort', onAbort)
      if (stream != null) {
        await stream.close()
      }
    }
  }
}
