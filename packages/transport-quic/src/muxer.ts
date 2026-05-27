import { AbstractStreamMuxer } from '@libp2p/utils'
import { quicBiDiStreamToStream } from './stream.ts'
import type { QUICStream } from './stream.ts'
import type { ComponentLogger, CreateStreamOptions, MultiaddrConnection, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'
import type { QuicSession, QuicStream } from 'node:quic'

const PROTOCOL = '/quic-v1'

export interface QUICTransportStreamMuxerInit {
  maxInboundStreams?: number
  maxOutboundStreams?: number
}

class QUICTransportStreamMuxer extends AbstractStreamMuxer<QUICStream> {
  private session: QuicSession
  private streamIDCounter: number

  constructor (session: QuicSession, maConn: MultiaddrConnection, init: QUICTransportStreamMuxerInit = {}) {
    super(maConn, {
      protocol: PROTOCOL,
      name: 'muxer'
    })

    this.session = session
    this.streamIDCounter = 0

    //! TODO unclear how to add backpressure here?
    this.session.onstream = (stream: QuicStream) => {
      this.onRemoteStream(
        quicBiDiStreamToStream(
          stream,
          String(this.streamIDCounter++),
          'inbound',
          this.log,
          this.streamOptions
        )
      )
    }
  }

  async onCreateStream (options: CreateStreamOptions): Promise<QUICStream> {
    const quicStream = await this.session.createBidirectionalStream()
    options?.signal?.throwIfAborted()

    return quicBiDiStreamToStream(
      quicStream,
      String(this.streamIDCounter++),
      'outbound',
      this.log,
      options
    )
  }

  onData (): void {

  }

  sendReset (): void {
    this.session.close()
  }
}

export function quicMuxer (session: QuicSession, log: ComponentLogger, init: QUICTransportStreamMuxerInit): StreamMuxerFactory {
  return {
    protocol: PROTOCOL,
    createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
      return new QUICTransportStreamMuxer(session, maConn, init)
    }
  }
}
