import { AbstractStream, type AbstractStreamInit } from '@libp2p/utils/abstract-stream'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, ComponentLogger, Direction, Stream } from '@libp2p/interface'

interface WebTransportStreamInit extends AbstractStreamInit {
  bidiStream: WebTransportBidirectionalStream
}

class WebTransportStream extends AbstractStream {
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>

  constructor (init: WebTransportStreamInit) {
    super(init)

    this.writer = init.bidiStream.writable.getWriter()
    this.reader = init.bidiStream.readable.getReader()

    Promise.resolve()
      .then(async () => {
        while (true) {
          const result = await this.reader.read()

          if (result.done) {
            init.log('remote closed write')
            return
          }

          if (result.value != null) {
            this.sourcePush(new Uint8ArrayList(result.value))
          }
        }
      })
      .catch(err => {
        init.log.error('error reading from stream', err)
        this.abort(err)
      })
      .finally(() => {
        this.remoteCloseWrite()
      })

    void this.writer.closed
      .then(() => {
        init.log('writer closed')
      })
      .catch((err) => {
        init.log('writer close promise rejected', err)
      })
      .finally(() => {
        this.remoteCloseRead()
      })
  }

  sendNewStream (options?: AbortOptions | undefined): void {
    // this is a no-op
  }

  async sendData (buf: Uint8ArrayList, options?: AbortOptions): Promise<void> {
    for await (const chunk of buf) {
      this.log('sendData waiting for writer to be ready')
      await raceSignal(this.writer.ready, options?.signal)

      // the streams spec recommends not waiting for data to be sent
      // https://streams.spec.whatwg.org/#example-manual-write-dont-await
      this.writer.write(chunk)
        .catch(err => {
          this.log.error('error sending stream data', err)
        })
    }
  }

  async sendReset (options?: AbortOptions): Promise<void> {
    this.log('sendReset aborting writer')
    await raceSignal(this.writer.abort(), options?.signal)
    this.log('sendReset aborted writer')
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.log('sendCloseWrite closing writer')
    await raceSignal(this.writer.close(), options?.signal)
    this.log('sendCloseWrite closed writer')
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    this.log('sendCloseRead cancelling reader')
    await raceSignal(this.reader.cancel(), options?.signal)
    this.log('sendCloseRead cancelled reader')
  }
}

export async function webtransportBiDiStreamToStream (bidiStream: WebTransportBidirectionalStream, streamId: string, direction: Direction, activeStreams: Stream[], onStreamEnd: undefined | ((s: Stream) => void), logger: ComponentLogger): Promise<Stream> {
  const log = logger.forComponent(`libp2p:webtransport:stream:${direction}:${streamId}`)

  const stream = new WebTransportStream({
    bidiStream,
    id: streamId,
    direction,
    log,
    onEnd: () => {
      const index = activeStreams.findIndex(s => s === stream)
      if (index !== -1) {
        activeStreams.splice(index, 1)
      }

      onStreamEnd?.(stream)
    }
  })

  return stream
}
