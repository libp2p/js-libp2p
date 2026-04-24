import { AbstractStream } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions, MessageStreamDirection, Logger, StreamOptions } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { QuicStream } from 'node:quic'
import type { Uint8ArrayList } from 'uint8arraylist'

interface QUICStreamInit extends AbstractStreamInit {
  stream: QuicStream
}

export class QUICStream extends AbstractStream {
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>

  constructor (init: QUICStreamInit) {
    super(init)

    // @ts-expect-error this comes from https://github.com/nodejs/node/pull/62876
    // and is missing from the types
    this.writer = init.stream.writer

    Promise.resolve()
      .then(async () => {
        // @ts-expect-error not in types
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
      // @ts-expect-error not in types
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
      // @ts-expect-error not in types
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
    // @ts-expect-error not in types
    this.writer.fail(err)
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.log('sendCloseWrite closing writer')
    // @ts-expect-error not in types
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
