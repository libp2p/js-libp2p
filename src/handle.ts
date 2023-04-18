import { logger } from '@libp2p/logger'
import * as multistream from './multistream.js'
import { handshake } from 'it-handshake'
import { PROTOCOL_ID } from './constants.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Duplex, Source } from 'it-stream-types'
import type { ByteArrayInit, ByteListInit, MultistreamSelectInit, ProtocolStream } from './index.js'

const log = logger('libp2p:mss:handle')

/**
 * Handle multistream protocol selections for the given list of protocols.
 *
 * Note that after a protocol is handled `listener` can no longer be used.
 *
 * @param stream - A duplex iterable stream to listen on
 * @param protocols - A list of protocols (or single protocol) that this listener is able to speak.
 * @param options - an options object containing an AbortSignal and an optional boolean `writeBytes` - if this is true, `Uint8Array`s will be written into `duplex`, otherwise `Uint8ArrayList`s will
 * @returns A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`
 * @example
 *
 * ```js
 * import { pipe } from 'it-pipe'
 * import * as mss from '@libp2p/multistream-select'
 * import { Mplex } from '@libp2p/mplex'
 *
 * const muxer = new Mplex({
 *   async onStream (muxedStream) {
 *   // mss.handle(handledProtocols)
 *   // Returns selected stream and protocol
 *   const { stream, protocol } = await mss.handle(muxedStream, [
 *     '/ipfs-dht/1.0.0',
 *     '/ipfs-bitswap/1.0.0'
 *   ])
 *
 *   // Typically here we'd call the handler function that was registered in
 *   // libp2p for the given protocol:
 *   // e.g. handlers[protocol].handler(stream)
 *   //
 *   // If protocol was /ipfs-dht/1.0.0 it might do something like this:
 *   // try {
 *   //   await pipe(
 *   //     dhtStream,
 *   //     source => (async function * () {
 *   //       for await (const chunk of source)
 *   //         // Incoming DHT data -> process and yield to respond
 *   //     })(),
 *   //     dhtStream
 *   //   )
 *   // } catch (err) {
 *   //   // Error in stream
 *   // }
 *   }
 * })
 * ```
 */
export async function handle (stream: Duplex<Source<Uint8Array>, Source<Uint8Array>>, protocols: string | string[], options: ByteArrayInit): Promise<ProtocolStream<Uint8Array>>
export async function handle (stream: Duplex<Source<Uint8ArrayList | Uint8Array>, Source<Uint8ArrayList | Uint8Array>>, protocols: string | string[], options?: ByteListInit): Promise<ProtocolStream<Uint8ArrayList, Uint8ArrayList | Uint8Array>>
export async function handle (stream: any, protocols: string | string[], options?: MultistreamSelectInit): Promise<ProtocolStream<any>> {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { writer, reader, rest, stream: shakeStream } = handshake(stream)

  while (true) {
    const protocol = await multistream.readString(reader, options)
    log.trace('read "%s"', protocol)

    if (protocol === PROTOCOL_ID) {
      log.trace('respond with "%s" for "%s"', PROTOCOL_ID, protocol)
      multistream.write(writer, uint8ArrayFromString(PROTOCOL_ID), options)
      continue
    }

    if (protocols.includes(protocol)) {
      multistream.write(writer, uint8ArrayFromString(protocol), options)
      log.trace('respond with "%s" for "%s"', protocol, protocol)
      rest()
      return { stream: shakeStream, protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      multistream.write(writer, new Uint8ArrayList(...protocols.map(p => multistream.encode(uint8ArrayFromString(p)))), options)
      // multistream.writeAll(writer, protocols.map(p => uint8ArrayFromString(p)))
      log.trace('respond with "%s" for %s', protocols, protocol)
      continue
    }

    multistream.write(writer, uint8ArrayFromString('na'), options)
    log('respond with "na" for "%s"', protocol)
  }
}
