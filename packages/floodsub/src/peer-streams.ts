import { pbStream } from '@libp2p/utils'
import { TypedEventEmitter } from 'main-event'
import { RPC } from './message/rpc.ts'
import type { PubSubRPC } from './floodsub.ts'
import type { PeerStreamsEvents } from './index.ts'
import type { Stream, PeerId } from '@libp2p/interface'
import type { ProtobufMessageStream, ProtobufStreamOpts } from '@libp2p/utils'
import type { DecoderOptions as LpDecoderOptions } from 'it-length-prefixed'

export interface PeerStreamInit {
  peerId: PeerId
  stream: Stream
}

export interface DecoderOptions extends LpDecoderOptions {
  // other custom options we might want for `attachInboundStream`
}

/**
 * Thin wrapper around a peer's inbound / outbound pubsub streams
 */
export class PeerStreams extends TypedEventEmitter<PeerStreamsEvents> {
  public readonly peerId: PeerId

  /**
   * An AbortController for controlled shutdown of the inbound stream
   */
  private readonly shutDownController: AbortController
  // messages sent by the remote
  private inboundPb?: ProtobufMessageStream<RPC>
  // messages we send
  private outboundPb?: ProtobufMessageStream<RPC>

  constructor (peerId: PeerId) {
    super()

    this.peerId = peerId
    this.shutDownController = new AbortController()
  }

  attachInboundStream (stream: Stream, streamOpts?: Partial<ProtobufStreamOpts>): void {
    this.inboundPb = pbStream(stream, streamOpts).pb(RPC)

    Promise.resolve().then(async () => {
      while (true) {
        if (this.inboundPb == null) {
          return
        }

        const message = await this.inboundPb.read({
          signal: this.shutDownController.signal
        })

        this.safeDispatchEvent('message', {
          detail: message
        })
      }
    })
      .catch(err => {
        this.inboundPb?.unwrap().unwrap().abort(err)
      })
  }

  attachOutboundStream (stream: Stream, streamOpts?: Partial<ProtobufStreamOpts>): void {
    this.outboundPb = pbStream(stream, streamOpts).pb(RPC)
  }

  /**
   * Send a message to this peer
   */
  write (message: PubSubRPC): void {
    if (this.outboundPb == null) {
      return
    }

    this.outboundPb.write(message, {
      signal: this.shutDownController.signal
    })
      .catch(err => {
        this.outboundPb?.unwrap().unwrap().abort(err)
      })
  }

  /**
   * Closes the open connection to peer
   */
  close (): void {
    this.shutDownController.abort()

    Promise.all([
      this.inboundPb?.unwrap().unwrap().close()
        .catch(err => {
          this.inboundPb?.unwrap().unwrap().abort(err)
        }),
      this.outboundPb?.unwrap().unwrap().close()
        .catch(err => {
          this.inboundPb?.unwrap().unwrap().abort(err)
        })
    ])
  }
}
