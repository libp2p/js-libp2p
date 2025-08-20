import { closeSource } from '@libp2p/utils/close-source'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { TypedEventEmitter } from 'main-event'
import { Uint8ArrayList } from 'uint8arraylist'
import type { ComponentLogger, Logger, Stream, PeerId, PeerStreamEvents } from '@libp2p/interface'
import type { DecoderOptions as LpDecoderOptions } from 'it-length-prefixed'
import type { Pushable } from 'it-pushable'

export interface PeerStreamsInit {
  id: PeerId
  protocol: string
}

export interface PeerStreamsComponents {
  logger: ComponentLogger
}

export interface DecoderOptions extends LpDecoderOptions {
  // other custom options we might want for `attachInboundStream`
}

/**
 * Thin wrapper around a peer's inbound / outbound pubsub streams
 */
export class PeerStreams extends TypedEventEmitter<PeerStreamEvents> {
  public readonly id: PeerId
  public readonly protocol: string
  /**
   * Write stream - it's preferable to use the write method
   */
  public outboundStream?: Pushable<Uint8ArrayList>
  /**
   * Read stream
   */
  public inboundStream?: AsyncIterable<Uint8ArrayList>
  /**
   * The raw outbound stream, as retrieved from conn.newStream
   */
  private _rawOutboundStream?: Stream
  /**
   * The raw inbound stream, as retrieved from the callback from libp2p.handle
   */
  private _rawInboundStream?: Stream
  /**
   * An AbortController for controlled shutdown of the inbound stream
   */
  private readonly _inboundAbortController: AbortController
  private closed: boolean
  private readonly log: Logger

  constructor (components: PeerStreamsComponents, init: PeerStreamsInit) {
    super()

    this.log = components.logger.forComponent('libp2p-pubsub:peer-streams')
    this.id = init.id
    this.protocol = init.protocol

    this._inboundAbortController = new AbortController()
    this.closed = false
  }

  /**
   * Do we have a connection to read from?
   */
  get isReadable (): boolean {
    return Boolean(this.inboundStream)
  }

  /**
   * Do we have a connection to write on?
   */
  get isWritable (): boolean {
    return Boolean(this.outboundStream)
  }

  /**
   * Send a message to this peer.
   * Throws if there is no `stream` to write to available.
   */
  write (data: Uint8Array | Uint8ArrayList): void {
    if (this.outboundStream == null) {
      const id = this.id.toString()
      throw new Error('No writable connection to ' + id)
    }

    this.outboundStream.push(data instanceof Uint8Array ? new Uint8ArrayList(data) : data)
  }

  /**
   * Attach a raw inbound stream and setup a read stream
   */
  attachInboundStream (stream: Stream, decoderOptions?: DecoderOptions): AsyncIterable<Uint8ArrayList> {
    const abortListener = (): void => {
      closeSource(stream.source, this.log)
    }

    this._inboundAbortController.signal.addEventListener('abort', abortListener, {
      once: true
    })

    // Create and attach a new inbound stream
    // The inbound stream is:
    // - abortable, set to only return on abort, rather than throw
    // - transformed with length-prefix transform
    this._rawInboundStream = stream
    this.inboundStream = pipe(
      this._rawInboundStream,
      (source) => lp.decode(source, decoderOptions)
    )

    this.dispatchEvent(new CustomEvent('stream:inbound'))
    return this.inboundStream
  }

  /**
   * Attach a raw outbound stream and setup a write stream
   */
  async attachOutboundStream (stream: Stream): Promise<Pushable<Uint8ArrayList>> {
    // If an outbound stream already exists, gently close it
    const _prevStream = this.outboundStream
    if (this.outboundStream != null) {
      // End the stream without emitting a close event
      this.outboundStream.end()
    }

    this._rawOutboundStream = stream
    this.outboundStream = pushable<Uint8ArrayList>({
      onEnd: (shouldEmit) => {
        // close writable side of the stream if it exists
        this._rawOutboundStream?.closeWrite()
          .catch(err => {
            this.log('error closing outbound stream', err)
          })

        this._rawOutboundStream = undefined
        this.outboundStream = undefined
        if (shouldEmit != null) {
          this.dispatchEvent(new CustomEvent('close'))
        }
      }
    })

    pipe(
      this.outboundStream,
      (source) => lp.encode(source),
      this._rawOutboundStream
    ).catch((err: Error) => {
      this.log.error(err)
    })

    // Only emit if the connection is new
    if (_prevStream == null) {
      this.dispatchEvent(new CustomEvent('stream:outbound'))
    }

    return this.outboundStream
  }

  /**
   * Closes the open connection to peer
   */
  close (): void {
    if (this.closed) {
      return
    }

    this.closed = true

    // End the outbound stream
    if (this.outboundStream != null) {
      this.outboundStream.end()
    }
    // End the inbound stream
    if (this.inboundStream != null) {
      this._inboundAbortController.abort()
    }

    this._rawOutboundStream = undefined
    this.outboundStream = undefined
    this._rawInboundStream = undefined
    this.inboundStream = undefined
    this.dispatchEvent(new CustomEvent('close'))
  }
}
