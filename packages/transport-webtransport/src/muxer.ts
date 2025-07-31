import { AbstractStreamMuxer } from '@libp2p/utils'
import { webtransportBiDiStreamToStream } from './stream.js'
import type WebTransport from './webtransport.js'
import type { CreateStreamOptions, Stream, StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface'
import type { AbstractStreamMuxerInit } from '@libp2p/utils'

export interface WebTransportMuxerInit extends Omit<AbstractStreamMuxerInit, 'maconn' | 'log'> {

}

class WebTransportStreamMuxer extends AbstractStreamMuxer {
  private webTransport: WebTransport
  private streamIDCounter: number
  private reader: ReadableStreamDefaultReader<WebTransportBidirectionalStream>

  constructor (webTransport: WebTransport, init: WebTransportMuxerInit) {
    super({
      ...init,
      protocol: 'webtransport',
      log: init.maConn.log.newScope('muxer')
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

  async onCreateStream (options: CreateStreamOptions): Promise<Stream> {
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
  const protocol = 'webtransport'

  return {
    protocol,
    createStreamMuxer (init: StreamMuxerInit): StreamMuxer {
      return new WebTransportStreamMuxer(webTransport, {
        ...init,
        protocol
      })
    }
  }
}
