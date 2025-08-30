import { AbstractMessageStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions } from '@libp2p/interface'
import type { MessageStreamInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface WebTransportMessageStreamInit extends MessageStreamInit {
  stream: WebTransportBidirectionalStream
}

export class WebTransportMessageStream extends AbstractMessageStream {
  private writer: WritableStreamDefaultWriter<any>
  private reader: ReadableStreamDefaultReader<any>

  constructor (init: WebTransportMessageStreamInit) {
    super(init)

    this.writer = init.stream.writable.getWriter()
    this.reader = init.stream.readable.getReader()

    Promise.resolve().then(async () => {
      while (true) {
        const { done, value } = await this.reader.read()

        if (value != null) {
          this.onData(value)
        }

        if (done) {
          break
        }
      }
    })
      .catch(err => {
        this.abort(err)
      })
  }

  async close (options?: AbortOptions): Promise<void> {
    await raceSignal(this.writer.close(), options?.signal)
  }

  sendData (data: Uint8ArrayList): SendResult {
    this.writer.write(data.subarray())
      .catch(err => {
        this.abort(err)
      })

    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  sendReset (err: Error): void {
    this.writer.abort(err)
      .catch(err => {
        this.log.error('could not send reset - %e', err)
      })
  }

  sendPause (): void {

  }

  sendResume (): void {

  }
}
