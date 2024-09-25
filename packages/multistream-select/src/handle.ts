import { encode } from 'it-length-prefixed'
import { lpStream } from 'it-length-prefixed-stream'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_PROTOCOL_LENGTH, PROTOCOL_ID } from './constants.js'
import * as multistream from './multistream.js'
import type { MultistreamSelectInit, ProtocolStream } from './index.js'
import type { Duplex } from 'it-stream-types'

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
 * ```TypeScript
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
export async function handle <Stream extends Duplex<any, any, any>> (stream: Stream, protocols: string | string[], options: MultistreamSelectInit): Promise<ProtocolStream<Stream>> {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  options.log.trace('handle: available protocols %s', protocols)

  const lp = lpStream(stream, {
    ...options,
    maxDataLength: MAX_PROTOCOL_LENGTH,
    maxLengthLength: 2 // 2 bytes is enough to length-prefix MAX_PROTOCOL_LENGTH
  })

  while (true) {
    options.log.trace('handle: reading incoming string')
    const protocol = await multistream.readString(lp, options)
    options.log.trace('handle: read "%s"', protocol)

    if (protocol === PROTOCOL_ID) {
      options.log.trace('handle: respond with "%s" for "%s"', PROTOCOL_ID, protocol)
      await multistream.write(lp, uint8ArrayFromString(`${PROTOCOL_ID}\n`), options)
      options.log.trace('handle: responded with "%s" for "%s"', PROTOCOL_ID, protocol)
      continue
    }

    if (protocols.includes(protocol)) {
      options.log.trace('handle: respond with "%s" for "%s"', protocol, protocol)
      await multistream.write(lp, uint8ArrayFromString(`${protocol}\n`), options)
      options.log.trace('handle: responded with "%s" for "%s"', protocol, protocol)

      return { stream: lp.unwrap(), protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      const protos = new Uint8ArrayList(
        ...protocols.map(p => encode.single(uint8ArrayFromString(`${p}\n`))),
        uint8ArrayFromString('\n')
      )

      options.log.trace('handle: respond with "%s" for %s', protocols, protocol)
      await multistream.write(lp, protos, options)
      options.log.trace('handle: responded with "%s" for %s', protocols, protocol)
      continue
    }

    options.log.trace('handle: respond with "na" for "%s"', protocol)
    await multistream.write(lp, uint8ArrayFromString('na\n'), options)
    options.log('handle: responded with "na" for "%s"', protocol)
  }
}
