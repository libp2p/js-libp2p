import { MuxerClosedError, TypedEventEmitter } from '@libp2p/interface'
import { raceSignal } from 'race-signal'
import { isPromise } from './is-promise.ts'
import type { AbstractStream } from './abstract-stream.ts'
import type { AbortOptions, CreateStreamOptions, Logger, MessageStream, Stream, StreamMuxer, StreamMuxerEvents, StreamMuxerOptions, StreamMuxerStatus, StreamOptions } from '@libp2p/interface'
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
}

export abstract class AbstractStreamMuxer <MuxedStream extends AbstractStream = AbstractStream> extends TypedEventEmitter<StreamMuxerEvents<MuxedStream>> implements StreamMuxer<MuxedStream> {
  public streams: MuxedStream[]
  public protocol: string
  public status: StreamMuxerStatus

  protected log: Logger
  protected maConn: MessageStream
  protected streamOptions?: StreamOptions

  constructor (maConn: MessageStream, init: AbstractStreamMuxerInit) {
    super()

    this.maConn = maConn
    this.protocol = init.protocol
    this.streams = []
    this.status = 'open'
    this.log = maConn.log.newScope(init.name)
    this.streamOptions = init.streamOptions

    // read/write all data from/to underlying maConn
    this.maConn.addEventListener('message', (evt) => {
      try {
        this.onData(evt.data)
      } catch (err: any) {
        this.abort(err)
        this.maConn.abort(err)
      }
    })

    // close muxer when underlying maConn closes
    this.maConn.addEventListener('close', (evt) => {
      if (this.status === 'open') {
        this.onTransportClosed()
      }
    })

    // signal stream writers when the underlying connection can accept more data
    this.maConn.addEventListener('drain', () => {
      this.log('underlying stream drained, signal %d streams to continue writing', this.streams.length)

      this.streams.forEach(stream => {
        stream.safeDispatchEvent('drain')
      })
    })
  }

  send (data: Uint8Array | Uint8ArrayList): boolean {
    return this.maConn.send(data)
  }

  async close (options?: AbortOptions): Promise<void> {
    if (this.status === 'closed') {
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

  onTransportClosed (): void {
    this.status = 'closing'

    try {
      [...this.streams].forEach(stream => {
        stream.onMuxerClosed()
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

    this.safeDispatchEvent('stream', {
      detail: stream
    })
  }

  private cleanUpStream (stream: Stream): void {
    const onEnd = (): void => {
      const index = this.streams.findIndex(s => s === stream)

      if (index !== -1) {
        this.streams.splice(index, 1)
      }

      // TODO: standardize metrics
      // this.metrics?.increment({ [`${stream.direction}_stream_end`]: true })
      // this.metrics?.increment({ [`${stream.direction}_stream_error`]: true })
    }

    // TODO: standardize metrics
    // this.metrics?.increment({ [`${stream.direction}_stream`]: true })

    stream.addEventListener('close', onEnd)
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
