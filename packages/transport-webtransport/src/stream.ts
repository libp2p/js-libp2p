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

    Promise.resolve().then(async () => {
      while (true) {
        const result = await this.reader.read()

        if (result.done) {
          init.log('remote closed read')
          this.remoteCloseRead()
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

    void this.writer.closed
      .then(() => {
        init.log('remote closed write')
      })
      .catch((err) => {
        init.log('writer close promise rejected', err)
      })
      .finally(() => {
        this.remoteCloseWrite()
      })
  }

  sendNewStream (options?: AbortOptions | undefined): void {
    // this is a no-op
  }

  async sendData (buf: Uint8ArrayList, options?: AbortOptions): Promise<void> {
    for await (const chunk of buf) {
      await raceSignal(this.writer.ready, options?.signal)
      await raceSignal(this.writer.write(chunk), options?.signal)
    }
  }

  async sendReset (options?: AbortOptions): Promise<void> {
    this.log('sendReset waiting for writer to be ready')
    await raceSignal(this.writer.ready, options?.signal)
    this.log('sendReset aborting writer')
    await raceSignal(this.writer.abort(), options?.signal)
    this.log('sendReset aborted writer')
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.log('sendCloseWrite waiting for writer to be ready')
    await raceSignal(this.writer.ready, options?.signal)
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
