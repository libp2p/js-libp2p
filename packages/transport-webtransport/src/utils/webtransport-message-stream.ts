import { StreamMessageEvent } from '@libp2p/interface'
import { AbstractMessageStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions } from '@libp2p/interface'
import type { MessageStreamInit } from '@libp2p/utils'

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
          this.dispatchEvent(new StreamMessageEvent(value))
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

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    await raceSignal(this.writer.close(), options?.signal)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendData (data: Uint8Array): boolean {
    this.writer.write(data)
      .catch(err => {
        this.abort(err)
      })

    return true
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
