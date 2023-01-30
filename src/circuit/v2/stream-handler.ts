import { logger } from '@libp2p/logger'
import * as lp from 'it-length-prefixed'
import { Handshake, handshake } from 'it-handshake'
import type { Stream } from '@libp2p/interface-connection'
import type { Source } from 'it-stream-types'

const log = logger('libp2p:circuit:v2:stream-handler')

export interface StreamHandlerOptions {
  /**
   * A duplex iterable
   */
  stream: Stream

  /**
   * max bytes length of message
   */
  maxLength?: number
}

export class StreamHandlerV2 {
  private readonly stream: Stream
  private readonly shake: Handshake
  private readonly decoder: Source<Uint8Array>

  constructor (options: StreamHandlerOptions) {
    const { stream, maxLength = 4096 } = options

    this.stream = stream
    this.shake = handshake(this.stream)
    // @ts-expect-error some type incompatibilities
    this.decoder = lp.decode.fromReader(this.shake.reader, { maxDataLength: maxLength })
  }

  /**
   * Read and decode message
   *
   * @async
   */
  async read () {
    // @ts-expect-error FIXME is a source, needs to be a generator
    const msg = await this.decoder.next()
    if (msg.value != null) {
      return msg.value.slice()
    }

    log('read received no value, closing stream')
    // End the stream, we didn't get data
    this.close()
  }

  write (msg: Uint8Array) {
    this.shake.write(lp.encode.single(msg))
  }

  /**
   * Return the handshake rest stream and invalidate handler
   */
  rest () {
    this.shake.rest()
    return this.shake.stream
  }

  /**
   * @param msg - An encoded Uint8Array protobuf message
   */
  end (msg: Uint8Array) {
    this.write(msg)
    this.close()
  }

  /**
   * Close the stream
   *
   */
  close () {
    log('closing the stream')
    void this.rest().sink([]).catch(err => {
      log.error(err)
    })
  }
}
