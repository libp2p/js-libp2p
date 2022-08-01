import { logger } from '@libp2p/logger'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import * as lp from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { pipe } from 'it-pipe'
import { abortableSource } from 'abortable-iterator'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Stream } from '@libp2p/interface-connection'
import type { Pushable } from 'it-pushable'
import type { PeerStreamEvents } from '@libp2p/interface-pubsub'
import { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p-pubsub:peer-streams')

export interface PeerStreamsInit {
  id: PeerId
  protocol: string
}

/**
 * Thin wrapper around a peer's inbound / outbound pubsub streams
 */
export class PeerStreams extends EventEmitter<PeerStreamEvents> {
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

  constructor (init: PeerStreamsInit) {
    super()

    this.id = init.id
    this.protocol = init.protocol

    this._inboundAbortController = new AbortController()
    this.closed = false
  }

  /**
   * Do we have a connection to read from?
   */
  get isReadable () {
    return Boolean(this.inboundStream)
  }

  /**
   * Do we have a connection to write on?
   */
  get isWritable () {
    return Boolean(this.outboundStream)
  }

  /**
   * Send a message to this peer.
   * Throws if there is no `stream` to write to available.
   */
  write (data: Uint8Array | Uint8ArrayList) {
    if (this.outboundStream == null) {
      const id = this.id.toString()
      throw new Error('No writable connection to ' + id)
    }

    this.outboundStream.push(data instanceof Uint8Array ? new Uint8ArrayList(data) : data)
  }

  /**
   * Attach a raw inbound stream and setup a read stream
   */
  attachInboundStream (stream: Stream) {
    // Create and attach a new inbound stream
    // The inbound stream is:
    // - abortable, set to only return on abort, rather than throw
    // - transformed with length-prefix transform
    this._rawInboundStream = stream
    this.inboundStream = abortableSource(
      pipe(
        this._rawInboundStream,
        lp.decode()
      ),
      this._inboundAbortController.signal,
      { returnOnAbort: true }
    )

    this.dispatchEvent(new CustomEvent('stream:inbound'))
    return this.inboundStream
  }

  /**
   * Attach a raw outbound stream and setup a write stream
   */
  async attachOutboundStream (stream: Stream) {
    // If an outbound stream already exists, gently close it
    const _prevStream = this.outboundStream
    if (this.outboundStream != null) {
      // End the stream without emitting a close event
      await this.outboundStream.end()
    }

    this._rawOutboundStream = stream
    this.outboundStream = pushable<Uint8ArrayList>({
      objectMode: true,
      onEnd: (shouldEmit) => {
        // close writable side of the stream
        if (this._rawOutboundStream != null && this._rawOutboundStream.reset != null) { // eslint-disable-line @typescript-eslint/prefer-optional-chain
          this._rawOutboundStream.reset()
        }

        this._rawOutboundStream = undefined
        this.outboundStream = undefined
        if (shouldEmit != null) {
          this.dispatchEvent(new CustomEvent('close'))
        }
      }
    })

    pipe(
      this.outboundStream,
      lp.encode(),
      this._rawOutboundStream
    ).catch((err: Error) => {
      log.error(err)
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
  close () {
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
