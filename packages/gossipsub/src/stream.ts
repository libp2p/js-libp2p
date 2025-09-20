import { pipe } from '@libp2p/utils'
import { encode, decode } from 'it-length-prefixed'
import type { AbortOptions, Stream } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

interface OutboundStreamOpts {
  /** Max size in bytes for pushable buffer. If full, will throw on .push */
  maxBufferSize?: number
}

interface InboundStreamOpts {
  /** Max size in bytes for reading messages from the stream */
  maxDataLength?: number
}

export class OutboundStream {
  constructor (private readonly rawStream: Stream, errCallback: (e: Error) => void, opts: OutboundStreamOpts) {
    if (opts.maxBufferSize != null) {
      rawStream.maxWriteBufferLength = opts.maxBufferSize
    }

    rawStream.addEventListener('close', (evt) => {
      if (evt.error != null) {
        errCallback(evt.error)
      }
    })
  }

  get protocol (): string {
    return this.rawStream.protocol
  }

  async push (data: Uint8Array): Promise<void> {
    return this.pushPrefixed(encode.single(data))
  }

  /**
   * Same to push() but this is prefixed data so no need to encode length prefixed again
   */
  pushPrefixed (data: Uint8ArrayList): void {
    // TODO: backpressure
    this.rawStream.send(data)
  }

  async close (options?: AbortOptions): Promise<void> {
    await this.rawStream.close(options)
      .catch(err => {
        this.rawStream.abort(err)
      })
  }
}

export class InboundStream {
  public readonly source: AsyncIterable<Uint8ArrayList>

  private readonly rawStream: Stream
  private readonly closeController: AbortController

  constructor (rawStream: Stream, opts: InboundStreamOpts = {}) {
    this.rawStream = rawStream
    this.closeController = new AbortController()

    this.closeController.signal.addEventListener('abort', () => {
      rawStream.close()
        .catch(err => {
          rawStream.abort(err)
        })
    })

    this.source = pipe(
      this.rawStream,
      (source) => decode(source, opts)
    )
  }

  async close (): Promise<void> {
    this.closeController.abort()
  }
}
