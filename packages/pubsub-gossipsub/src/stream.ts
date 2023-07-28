import type { Stream } from '@libp2p/interface/connection'
import { abortableSource } from 'abortable-iterator'
import { pipe } from 'it-pipe'
import { pushable, type Pushable } from 'it-pushable'
import { encode, decode } from 'it-length-prefixed'
import type { Uint8ArrayList } from 'uint8arraylist'

type OutboundStreamOpts = {
  /** Max size in bytes for pushable buffer. If full, will throw on .push */
  maxBufferSize?: number
}

type InboundStreamOpts = {
  /** Max size in bytes for reading messages from the stream */
  maxDataLength?: number
}

export class OutboundStream {
  private readonly pushable: Pushable<Uint8Array>
  private readonly closeController: AbortController
  private readonly maxBufferSize: number

  constructor(private readonly rawStream: Stream, errCallback: (e: Error) => void, opts: OutboundStreamOpts) {
    this.pushable = pushable({ objectMode: false })
    this.closeController = new AbortController()
    this.maxBufferSize = opts.maxBufferSize ?? Infinity

    pipe(
      abortableSource(this.pushable, this.closeController.signal, { returnOnAbort: true }),
      (source) => encode(source),
      this.rawStream
    ).catch(errCallback)
  }

  get protocol(): string {
    // TODO remove this non-nullish assertion after https://github.com/libp2p/js-libp2p-interfaces/pull/265 is incorporated
    return this.rawStream.protocol!
  }

  push(data: Uint8Array): void {
    if (this.pushable.readableLength > this.maxBufferSize) {
      throw Error(`OutboundStream buffer full, size > ${this.maxBufferSize}`)
    }

    this.pushable.push(data)
  }

  close(): void {
    this.closeController.abort()
    // similar to pushable.end() but clear the internal buffer
    this.pushable.return()
    this.rawStream.close()
  }
}

export class InboundStream {
  public readonly source: AsyncIterable<Uint8ArrayList>

  private readonly rawStream: Stream
  private readonly closeController: AbortController

  constructor(rawStream: Stream, opts: InboundStreamOpts = {}) {
    this.rawStream = rawStream
    this.closeController = new AbortController()

    this.source = abortableSource(
      pipe(this.rawStream, (source) => decode(source, opts)),
      this.closeController.signal,
      {
        returnOnAbort: true
      }
    )
  }

  close(): void {
    this.closeController.abort()
    this.rawStream.close()
  }
}
