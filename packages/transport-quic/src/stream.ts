import { AbstractStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions, MessageStreamDirection, Logger, StreamOptions } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { ExperimentalQuicStreamWriter, QuicStream } from 'node:quic'
import type { Uint8ArrayList } from 'uint8arraylist'

interface QUICStreamInit extends AbstractStreamInit {
  stream: QuicStream
}

export class QUICStream extends AbstractStream {
  private readonly writer: ExperimentalQuicStreamWriter

  constructor (init: QUICStreamInit) {
    super(init)

    this.writer = init.stream.writer

    Promise.resolve()
      .then(async () => {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        for await (const bufs of init.stream) {
          bufs.forEach((buf: Uint8Array) => {
            this.onData(buf)
          })
        }

        this.onRemoteCloseWrite()
      })
      .catch(err => {
        this.abort(err)
      })
  }

  sendData (data: Uint8ArrayList): SendResult {
    let sentBytes = 0

    while (data.byteLength > 0) {
      const toWrite = Math.min(data.byteLength, this.writer.desiredSize ?? 0)

      if (toWrite === 0) {
        break
      }

      // TODO: have to copy before write otherwise error is thrown:
      // TypeError: Provided key doesn't match [[ArrayBufferDetachKey]]
      const bytes = data.subarray(0, toWrite).slice()
      data.consume(toWrite)
      this.writer.writeSync(bytes)
      sentBytes += toWrite
    }

    this.log.trace('desired size after sending %d bytes is %d bytes', sentBytes, this.writer.desiredSize)

    // null means the stream has errored - https://streams.spec.whatwg.org/#writable-stream-default-writer-get-desired-size
    if (this.writer.desiredSize == null) {
      return {
        sentBytes,
        canSendMore: false
      }
    }

    const canSendMore = this.writer.desiredSize > 0

    if (!canSendMore) {
      // wait for drain
      this.writer[Symbol.for('Stream.drainableProtocol')]?.()?.then(() => {
        this.safeDispatchEvent('drain')
      }, (err: any) => {
        this.abort(err)
      })
    }

    return {
      sentBytes,
      canSendMore
    }
  }

  sendReset (err: Error): void {
    this.writer.fail(err)
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.log('sendCloseWrite closing writer')
    await raceSignal(this.writer.end().catch(() => {}), options?.signal)
    this.log('sendCloseWrite closed writer')
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    this.log('sendCloseRead cancelling reader')
    // await raceSignal(this.reader.cancel(), options?.signal)
    this.log('sendCloseRead cancelled reader')
  }

  sendPause (): void {

  }

  sendResume (): void {
    // this.readData()
  }
}

export function quicBiDiStreamToStream (stream: QuicStream, streamId: string, direction: MessageStreamDirection, log: Logger, options?: StreamOptions): QUICStream {
  return new QUICStream({
    ...options,
    stream,
    id: streamId,
    direction,
    log: log.newScope(`${direction}:${streamId}`),
    protocol: ''
  })
}
