import { AbstractStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions, MessageStreamDirection, Logger, StreamOptions } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

interface WebTransportStreamInit extends AbstractStreamInit {
  stream: WebTransportBidirectionalStream
}

export class WebTransportStream extends AbstractStream {
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>

  constructor (init: WebTransportStreamInit) {
    super(init)

    this.writer = init.stream.writable.getWriter()
    this.reader = init.stream.readable.getReader()

    void this.writer.closed
      .then(() => {
        this.log('writer closed gracefully')
      })
      .catch((err) => {
        // chrome/ff send different messages
        if (err.message.includes('STOP_SENDING') || err.message.includes('StopSending')) {
          // err.code === 0 so we may be able to use this to detect remote close
          // read instead?
          this.onRemoteCloseRead()
        } else if (err.message.includes('RESET_STREAM') || err.message.includes('Reset')) {
          this.onRemoteReset()
        } else {
          this.log('writer close promise rejected - %e', err)
        }
      })

    this.readData()
  }

  private readData (): void {
    Promise.resolve()
      .then(async () => {
        while (true) {
          const result = await this.reader.read()

          if (result.value != null) {
            this.onData(result.value)
          }

          if (result.done) {
            this.log('remote closed write')
            this.onRemoteCloseWrite()
            return
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
    for (const buf of data) {
      this.writer.write(buf)
        .catch(err => {
          this.abort(err)
        })
    }

    this.log.trace('desired size after sending %d bytes is %d bytes', data.byteLength, this.writer.desiredSize)

    // null means the stream has errored - https://streams.spec.whatwg.org/#writable-stream-default-writer-get-desired-size
    if (this.writer.desiredSize == null) {
      return {
        sentBytes: data.byteLength,
        canSendMore: false
      }
    }

    const canSendMore = this.writer.desiredSize > 0

    if (!canSendMore) {
      this.writer.ready.then(() => {
        this.safeDispatchEvent('drain')
      }, (err) => {
        this.abort(err)
      })
    }

    return {
      sentBytes: data.byteLength,
      canSendMore
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
    await raceSignal(this.writer.close().catch(() => {}), options?.signal)
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

export function webtransportBiDiStreamToStream (stream: WebTransportBidirectionalStream, streamId: string, direction: MessageStreamDirection, log: Logger, options?: StreamOptions): WebTransportStream {
  return new WebTransportStream({
    ...options,
    stream,
    id: streamId,
    direction,
    log: log.newScope(`${direction}:${streamId}`),
    protocol: ''
  })
}
