import { AbstractStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions, MessageStreamDirection, Logger, StreamOptions } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

interface WebTransportStreamInit extends AbstractStreamInit {
  bidiStream: WebTransportBidirectionalStream
}

export class WebTransportStream extends AbstractStream {
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>

  constructor (init: WebTransportStreamInit) {
    super(init)

    this.writer = init.bidiStream.writable.getWriter()
    this.reader = init.bidiStream.readable.getReader()

    void this.writer.closed
      .then(() => {
        this.log('writer closed')
      })
      .catch((err) => {
        this.log('writer close promise rejected - %e', err)
      })
      .finally(() => {
        this.onRemoteCloseRead()
      })

    this.readData()
  }

  private readData (): void {
    Promise.resolve()
      .then(async () => {
        while (true) {
          const result = await this.reader.read()

          if (result.done) {
            this.log('remote closed write')
            this.onRemoteCloseWrite()
            return
          }

          if (result.value != null) {
            this.onData(result.value)
          }

          if (this.readStatus === 'paused') {
            break
          }
        }
      })
      .catch(err => {
        this.abort(err)
      })
      .finally(() => {
        this.reader.releaseLock()
      })
  }

  sendData (data: Uint8ArrayList): SendResult {
    // the streams spec recommends not waiting for data to be sent
    // https://streams.spec.whatwg.org/#example-manual-write-dont-await
    this.writer.ready
      .then(() => {
        for (const buf of data) {
          this.writer.write(buf)
        }
      })
      .catch(err => {
        this.log.error('error sending stream data - %e', err)
      })

    // The desiredSize read-only property of the WritableStreamDefaultWriter
    // interface returns the desired size required to fill the stream's internal
    // queue.
    //
    // the value will be null if the stream cannot be successfully written to
    // (due to either being errored, or having an abort queued up), and zero if
    // the stream is closed. It can be negative if the queue is over-full
    if (this.writer.desiredSize == null) {
      return {
        sentBytes: data.byteLength,
        canSendMore: false
      }
    }

    return {
      sentBytes: data.byteLength,
      canSendMore: this.writer.desiredSize > 0
    }
  }

  sendReset (err: Error): void {
    this.writer.abort(err)
      .catch(err => {
        this.log.error('error aborting writer - %e', err)
      })
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

  sendPause (): void {

  }

  sendResume (): void {
    this.readData()
  }
}

export function webtransportBiDiStreamToStream (bidiStream: WebTransportBidirectionalStream, streamId: string, direction: MessageStreamDirection, log: Logger, options?: StreamOptions): WebTransportStream {
  return new WebTransportStream({
    ...options,
    bidiStream,
    id: streamId,
    direction,
    log: log.newScope(`${direction}:${streamId}`),
    protocol: ''
  })
}
