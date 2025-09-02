import { MuxerClosedError, TypedEventEmitter } from '@libp2p/interface'
import { raceSignal } from 'race-signal'
import { MaxEarlyStreamsError } from './errors.ts'
import { isPromise } from './is-promise.ts'
import type { AbstractStream } from './abstract-stream.ts'
import type { AbortOptions, CounterGroup, CreateStreamOptions, EventHandler, Logger, MessageStream, Stream, StreamCloseEvent, StreamMessageEvent, StreamMuxer, StreamMuxerEvents, StreamMuxerOptions, StreamMuxerStatus, StreamOptions } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface AbstractStreamMuxerInit extends StreamMuxerOptions {
  /**
   * The protocol name for the muxer
   */
  protocol: string

  /**
   * The name of the muxer, used to create a new logging scope from the passed
   * connection's logger
   */
  name: string

  /**
   * A counter for muxer metrics
   */
  metrics?: CounterGroup
}

export abstract class AbstractStreamMuxer <MuxedStream extends AbstractStream = AbstractStream> extends TypedEventEmitter<StreamMuxerEvents<MuxedStream>> implements StreamMuxer<MuxedStream> {
  public streams: MuxedStream[]
  public protocol: string
  public status: StreamMuxerStatus

  protected log: Logger
  protected maConn: MessageStream
  protected streamOptions?: StreamOptions
  protected earlyStreams: MuxedStream[]
  protected maxEarlyStreams: number

  private readonly metrics?: CounterGroup

  constructor (maConn: MessageStream, init: AbstractStreamMuxerInit) {
    super()

    this.maConn = maConn
    this.protocol = init.protocol
    this.streams = []
    this.earlyStreams = []
    this.status = 'open'
    this.log = maConn.log.newScope(init.name)
    this.streamOptions = init.streamOptions
    this.maxEarlyStreams = init.maxEarlyStreams ?? 10
    this.metrics = init.metrics

    // read/write all data from/to underlying maConn
    const muxerMaConnOnMessage = (evt: StreamMessageEvent): void => {
      try {
        this.onData(evt.data)
      } catch (err: any) {
        this.abort(err)
        this.maConn.abort(err)
      }
    }
    this.maConn.addEventListener('message', muxerMaConnOnMessage)

    // signal stream writers when the underlying connection can accept more data
    const muxerMaConnOnDrain = (): void => {
      this.log('underlying stream drained, signal %d streams to continue writing', this.streams.length)

      this.streams.forEach(stream => {
        stream.onMuxerDrain()
      })
    }
    this.maConn.addEventListener('drain', muxerMaConnOnDrain)

    const muxerOnMaConnClose = (): void => {
      this.log('underlying stream closed with status %s and %d streams', this.status, this.streams.length)
      this.onTransportClosed()
    }
    this.maConn.addEventListener('close', muxerOnMaConnClose)
  }

  send (data: Uint8Array | Uint8ArrayList): boolean {
    const result = this.maConn.send(data)

    if (result === false) {
      this.log('underlying stream saturated, signal %d streams to pause writing', this.streams.length)

      this.streams.forEach(stream => {
        stream.onMuxerNeedsDrain()
      })
    }

    return result
  }

  async close (options?: AbortOptions): Promise<void> {
    if (this.status === 'closed' || this.status === 'closing') {
      return
    }

    this.status = 'closing'

    await raceSignal(Promise.all(
      [...this.streams].map(async s => {
        await s.close(options)
      })
    ), options?.signal)

    this.status = 'closed'
  }

  abort (err: Error): void {
    if (this.status === 'closed') {
      return
    }

    this.status = 'closing'

    ;[...this.streams].forEach(s => {
      s.abort(err)
    })

    this.status = 'closed'
  }

  onTransportClosed (err?: Error): void {
    this.status = 'closing'

    try {
      [...this.streams].forEach(stream => {
        stream.onTransportClosed(err)
      })
    } catch (err: any) {
      this.abort(err)
    }

    this.status = 'closed'
  }

  async createStream (options?: CreateStreamOptions): Promise<MuxedStream> {
    if (this.status !== 'open') {
      throw new MuxerClosedError()
    }

    let stream = this.onCreateStream({
      ...this.streamOptions,
      ...options
    })

    if (isPromise(stream)) {
      stream = await stream
    }

    this.streams.push(stream)
    this.cleanUpStream(stream)

    return stream
  }

  /**
   * Extending classes should invoke this method when a new stream was created
   * by the remote muxer
   */
  onRemoteStream (stream: MuxedStream): void {
    this.streams.push(stream)
    this.cleanUpStream(stream)

    if (this.listenerCount('stream') === 0) {
      // no listener has been added for the stream event yet, store the stream
      // to emit it later
      this.earlyStreams.push(stream)

      if (this.earlyStreams.length > this.maxEarlyStreams) {
        this.abort(new MaxEarlyStreamsError(`Too many early streams were opened - ${this.earlyStreams.length}/${this.maxEarlyStreams}`))
      }

      return
    }

    this.safeDispatchEvent('stream', {
      detail: stream
    })
  }

  private cleanUpStream (stream: Stream): void {
    const muxerOnStreamEnd = (evt: StreamCloseEvent): void => {
      const index = this.streams.findIndex(s => s === stream)

      if (index !== -1) {
        this.streams.splice(index, 1)
      }

      if (evt.error != null) {
        if (evt.local) {
          this.metrics?.increment({ [`${stream.direction}_stream_reset`]: true })
        } else {
          this.metrics?.increment({ [`${stream.direction}_stream_abort`]: true })
        }
      } else {
        this.metrics?.increment({ [`${stream.direction}_stream_end`]: true })
      }
    }
    stream.addEventListener('close', muxerOnStreamEnd)

    this.metrics?.increment({ [`${stream.direction}_stream`]: true })
  }

  addEventListener<K extends keyof StreamMuxerEvents<MuxedStream>>(type: K, listener: EventHandler<StreamMuxerEvents<MuxedStream>[K]> | null, options?: boolean | AddEventListenerOptions): void
  addEventListener (type: string, listener: EventHandler<Event>, options?: boolean | AddEventListenerOptions): void
  addEventListener (...args: any[]): void {
    // @ts-expect-error cannot ensure args has enough members
    super.addEventListener.apply(this, args)

    // if a 'stream' listener is being added and we have early streams, emit
    // them
    if (args[0] === 'stream' && this.earlyStreams.length > 0) {
      // event listeners can be added in constructors and often use object
      // properties - if this the case we can access a class member before it
      // has been initialized so dispatch the message in the microtask queue
      queueMicrotask(() => {
        this.earlyStreams.forEach(stream => {
          this.safeDispatchEvent('stream', {
            detail: stream
          })
        })
        this.earlyStreams = []
      })
    }
  }

  /**
   * A new outgoing stream needs to be created
   */
  abstract onCreateStream (options: CreateStreamOptions): MuxedStream | Promise<MuxedStream>

  /**
   * Multiplexed data was received from the remote muxer
   */
  abstract onData (data: Uint8Array | Uint8ArrayList): void
}
