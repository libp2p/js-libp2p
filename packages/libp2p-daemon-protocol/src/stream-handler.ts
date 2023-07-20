import { logger } from '@libp2p/logger'
import { handshake } from 'it-handshake'
import * as lp from 'it-length-prefixed'
import type { Handshake } from 'it-handshake'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p:daemon-protocol:stream-handler')

export interface StreamHandlerOptions {
  stream: Duplex<AsyncIterable<Uint8Array>, Source<Uint8Array>, Promise<void>>
  maxLength?: number
}

export class StreamHandler {
  private readonly stream: Duplex<AsyncIterable<Uint8Array>, Source<Uint8Array>, Promise<void>>
  private readonly shake: Handshake<Uint8Array>
  public decoder: Source<Uint8ArrayList>

  /**
   * Create a stream handler for connection
   */
  constructor (opts: StreamHandlerOptions) {
    const { stream, maxLength } = opts

    this.stream = stream
    this.shake = handshake(this.stream)
    this.decoder = lp.decode.fromReader(this.shake.reader, { maxDataLength: maxLength ?? 4096 })
  }

  /**
   * Read and decode message
   */
  async read (): Promise<Uint8Array | undefined> {
    // @ts-expect-error decoder is really a generator
    const msg = await this.decoder.next()
    if (msg.value != null) {
      return msg.value.subarray()
    }

    log('read received no value, closing stream')
    // End the stream, we didn't get data
    await this.close()
  }

  write (msg: Uint8Array | Uint8ArrayList): void {
    log('write message')
    this.shake.write(
      lp.encode.single(msg).subarray()
    )
  }

  /**
   * Return the handshake rest stream and invalidate handler
   */
  rest (): Duplex<AsyncGenerator<Uint8ArrayList | Uint8Array>, Source<Uint8Array>, Promise<void>> {
    this.shake.rest()
    return this.shake.stream
  }

  /**
   * Close the stream
   */
  async close (): Promise<void> {
    log('closing the stream')
    await this.rest().sink([])
  }
}
