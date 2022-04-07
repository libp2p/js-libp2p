import { logger } from '@libp2p/logger'
import * as lp from 'it-length-prefixed'
import { Handshake, handshake } from 'it-handshake'
import { CircuitRelay, ICircuitRelay } from '../pb/index.js'
import type { Stream } from '@libp2p/interfaces/connection'
import type { Source } from 'it-stream-types'

const log = logger('libp2p:circuit:stream-handler')

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

export class StreamHandler {
  private readonly stream: Stream
  private readonly shake: Handshake
  private readonly decoder: Source<Uint8Array>

  constructor (options: StreamHandlerOptions) {
    const { stream, maxLength = 4096 } = options

    this.stream = stream
    this.shake = handshake(this.stream)
    this.decoder = lp.decode.fromReader(this.shake.reader, { maxDataLength: maxLength })
  }

  /**
   * Read and decode message
   */
  async read () {
    // @ts-expect-error FIXME is a source, needs to be a generator
    const msg = await this.decoder.next()

    if (msg.value != null) {
      const value = CircuitRelay.decode(msg.value.slice())
      log('read message type', value.type)
      return value
    }

    log('read received no value, closing stream')
    // End the stream, we didn't get data
    this.close()
  }

  /**
   * Encode and write array of buffers
   */
  write (msg: ICircuitRelay) {
    log('write message type %s', msg.type)
    // @ts-expect-error lp.encode expects type type 'Buffer | BufferList', not 'Uint8Array'
    this.shake.write(lp.encode.single(CircuitRelay.encode(msg).finish()))
  }

  /**
   * Return the handshake rest stream and invalidate handler
   */
  rest () {
    this.shake.rest()
    return this.shake.stream
  }

  /**
   * @param {ICircuitRelay} msg - An unencoded CircuitRelay protobuf message
   */
  end (msg: ICircuitRelay) {
    this.write(msg)
    this.close()
  }

  /**
   * Close the stream
   */
  close () {
    log('closing the stream')
    void this.rest().sink([]).catch(err => {
      log.error(err)
    })
  }
}
