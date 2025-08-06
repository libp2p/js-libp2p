import { AbstractStreamMuxer } from '@libp2p/utils'
import { webtransportBiDiStreamToStream } from './stream.js'
import type { WebTransportStream } from './stream.ts'
import type WebTransport from './webtransport.js'
import type { CreateStreamOptions, MultiaddrConnection, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'

const PROTOCOL = '/webtransport'

class WebTransportStreamMuxer extends AbstractStreamMuxer<WebTransportStream> {
  private webTransport: WebTransport
  private streamIDCounter: number
  private reader: ReadableStreamDefaultReader<WebTransportBidirectionalStream>

  constructor (webTransport: WebTransport, maConn: MultiaddrConnection) {
    super(maConn, {
      protocol: PROTOCOL,
      name: 'muxer'
    })

    this.webTransport = webTransport
    this.streamIDCounter = 0
    this.reader = this.webTransport.incomingBidirectionalStreams.getReader()

    Promise.resolve()
      .then(async () => {
        //! TODO unclear how to add backpressure here?
        while (true) {
          const { done, value } = await this.reader.read()

          if (done || value == null) {
            break
          }

          this.onRemoteStream(
            webtransportBiDiStreamToStream(
              value,
              String(this.streamIDCounter++),
              'inbound',
              this.log
            )
          )
        }
      })
      .catch(err => {
        this.log.error('could not create a new stream - %e', err)
      })
  }

  async onCreateStream (options: CreateStreamOptions): Promise<WebTransportStream> {
    const wtStream = await this.webTransport.createBidirectionalStream()
    options?.signal?.throwIfAborted()

    return webtransportBiDiStreamToStream(wtStream, String(this.streamIDCounter++), 'outbound', this.log)
  }

  onData (): void {

  }

  sendReset (): void {
    this.webTransport.close()
  }
}

export function webtransportMuxer (webTransport: WebTransport): StreamMuxerFactory {
  return {
    protocol: PROTOCOL,
    createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
      return new WebTransportStreamMuxer(webTransport, maConn)
    }
  }
}
