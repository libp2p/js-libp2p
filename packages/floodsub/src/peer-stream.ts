import { pbStream } from '@libp2p/utils'
import { TypedEventEmitter } from 'main-event'
import { RPC } from './message/rpc.ts'
import type { PubSubRPC } from './floodsub.ts'
import type { PeerStreamEvents } from './index.ts'
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
export class PeerStream extends TypedEventEmitter<PeerStreamEvents> {
  public readonly peerId: PeerId
  public readonly protocol: string

  /**
   * An AbortController for controlled shutdown of the inbound stream
   */
  private readonly shutDownController: AbortController
  private pb: ProtobufMessageStream<RPC>

  constructor (peerId: PeerId, stream: Stream, options?: Partial<ProtobufStreamOpts>) {
    super()

    this.peerId = peerId
    this.protocol = stream.protocol
    this.pb = pbStream(stream, options).pb(RPC)

    this.shutDownController = new AbortController()

    Promise.resolve().then(async () => {
      while (true) {
        const message = await this.pb.read({
          signal: this.shutDownController.signal
        })

        this.safeDispatchEvent('message', {
          detail: message
        })
      }
    })
      .catch(err => {
        this.pb.unwrap().unwrap().abort(err)
      })
  }

  /**
   * Send a message to this peer
   */
  write (message: PubSubRPC): void {
    this.pb.write(message, {
      signal: this.shutDownController.signal
    })
      .catch(err => {
        this.pb.unwrap().unwrap().abort(err)
      })
  }

  /**
   * Closes the open connection to peer
   */
  close (): void {
    this.shutDownController.abort()
  }
}
