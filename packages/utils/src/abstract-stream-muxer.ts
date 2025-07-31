import { MuxerClosedError, StreamStateError, TypedEventEmitter } from '@libp2p/interface'
import { raceSignal } from 'race-signal'
import type { AbortOptions, CreateStreamOptions, Logger, MultiaddrConnection, Stream, StreamMuxer, StreamMuxerEvents, StreamMuxerInit, StreamMuxerStatus } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface AbstractStreamMuxerInit extends StreamMuxerInit {
  /**
   * The protocol name for the muxer
   */
  protocol: string

  /**
   * A logger
   */
  log: Logger
}

export abstract class AbstractStreamMuxer <MuxedStream extends Stream = Stream> extends TypedEventEmitter<StreamMuxerEvents> implements StreamMuxer {
  public streams: MuxedStream[]
  public protocol: string
  public status: StreamMuxerStatus

  protected log: Logger

  private readonly maConn: MultiaddrConnection

  constructor (init: AbstractStreamMuxerInit) {
    super()

    this.maConn = init.maConn
    this.protocol = init.protocol
    this.streams = []
    this.status = 'open'
    this.log = init.log

    // read/write all data from/to underlying maConn
    this.maConn.addEventListener('message', (evt) => {
      this.onData(evt.data)
    })

    // close muxer when underlying maConn closes
    this.maConn.addEventListener('close', () => {
      // we are already closed, nothing to do
      if (this.status === 'closed') {
        return
      }

      // can't send any more data so all we can do is abort
      this.abort(new StreamStateError('The underlying MultiAddrConnection closed'))
    })

    // signal stream writers when the underlying connection can accept more data
    this.maConn.addEventListener('drain', () => {
      this.log('underlying stream drained, signal to streams to continue writing')

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
      this.streams.map(async s => {
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

    this.streams.forEach(s => {
      s.abort(err)
    })

    this.status = 'closed'
  }

  async createStream (options?: CreateStreamOptions): Promise<Stream> {
    if (this.status !== 'open') {
      throw new MuxerClosedError()
    }

    const stream = await this.onCreateStream(options ?? {})
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

      // TODO: standardise metrics
      // this.metrics?.increment({ [`${stream.direction}_stream_end`]: true })
      // this.metrics?.increment({ [`${stream.direction}_stream_error`]: true })
    }

    // TODO: standardise metrics
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
