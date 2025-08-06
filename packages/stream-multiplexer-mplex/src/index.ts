/**
 * @packageDocumentation
 *
 * This is a [simple stream multiplexer(https://docs.libp2p.io/concepts/multiplex/mplex/) that has been deprecated.
 *
 * Please use [@chainsafe/libp2p-yamux](https://www.npmjs.com/package/@chainsafe/libp2p-yamux) instead.
 *
 * @example
 *
 * ```TypeScript
 * import { mplex } from '@libp2p/mplex'
 * import { pipe } from 'it-pipe'
 *
 * const factory = mplex()
 *
 * const muxer = factory.createStreamMuxer(components, {
 *   onStream: stream => { // Receive a duplex stream from the remote
 *     // ...receive data from the remote and optionally send data back
 *   },
 *   onStreamEnd: stream => {
 *     // ...handle any tracking you may need of stream closures
 *   }
 * })
 *
 * pipe(conn, muxer, conn) // conn is duplex connection to another peer
 *
 * const stream = muxer.newStream() // Create a new duplex stream to the remote
 *
 * // Use the duplex stream to send some data to the remote...
 * pipe([1, 2, 3], stream)
 * ```
 */

import { serviceCapabilities } from '@libp2p/interface'
import { MplexStreamMuxer } from './mplex.js'
import type { MultiaddrConnection, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'

export interface MplexInit {
  /**
   * The maximum size of message that can be sent in one go in bytes.
   * Messages larger than this will be split into multiple smaller
   * messages. If we receive a message larger than this an error will
   * be thrown and the connection closed.
   *
   * @default 1_048_576
   */
  maxMessageSize?: number

  /**
   * Constrains the size of the unprocessed message queue buffer.
   * Before messages are deserialized, the raw bytes are buffered to ensure
   * we have the complete message to deserialized. If the queue gets longer
   * than this value an error will be thrown and the connection closed.
   *
   * @default 4_194_304
   */
  maxUnprocessedMessageQueueSize?: number

  /**
   * When `maxInboundStreams` is hit, if the remote continues try to open
   * more than this many new multiplexed streams per second the connection
   * will be closed
   *
   * @default 5
   */
  disconnectThreshold?: number
}

class Mplex implements StreamMuxerFactory {
  public protocol = '/mplex/6.7.0'
  private readonly _init: MplexInit

  constructor (init: MplexInit = {}) {
    this._init = init
  }

  readonly [Symbol.toStringTag] = '@libp2p/mplex'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/stream-multiplexing'
  ]

  createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
    return new MplexStreamMuxer(maConn, {
      ...this._init
    })
  }
}

/**
 * @deprecated mplex is deprecated as it has no flow control. Please use yamux instead.
 */
export function mplex (init: MplexInit = {}): () => StreamMuxerFactory {
  return () => new Mplex(init)
}
