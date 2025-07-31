import { lpStream } from '@libp2p/utils'
import { encode } from 'it-length-prefixed'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_PROTOCOL_LENGTH, PROTOCOL_ID } from './constants.js'
import { readString } from './multistream.js'
import type { MultistreamSelectInit } from './index.js'
import type { MultiaddrConnection, MessageStream } from '@libp2p/interface'

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
export async function handle <Stream extends MessageStream = MultiaddrConnection> (stream: Stream, protocols: string | string[], options: MultistreamSelectInit = {}): Promise<string> {
  protocols = Array.isArray(protocols) ? protocols : [protocols]

  const log = stream.log.newScope('mss:handle')
  log.trace('available protocols %s', protocols)

  const lp = lpStream(stream, {
    ...options,
    maxDataLength: MAX_PROTOCOL_LENGTH,
    maxLengthLength: 2, // 2 bytes is enough to length-prefix MAX_PROTOCOL_LENGTH
    stopPropagation: true
  })

  while (true) {
    log.trace('reading incoming string')
    const protocol = await readString(lp, options)
    log.trace('read "%s"', protocol)

    if (protocol === PROTOCOL_ID) {
      log.trace('respond with "%s" for "%s"', PROTOCOL_ID, protocol)
      await lp.write(uint8ArrayFromString(`${PROTOCOL_ID}\n`), options)
      log.trace('responded with "%s" for "%s"', PROTOCOL_ID, protocol)
      continue
    }

    if (protocols.includes(protocol)) {
      log.trace('respond with "%s" for "%s"', protocol, protocol)
      await lp.write(uint8ArrayFromString(`${protocol}\n`), options)
      log.trace('responded with "%s" for "%s"', protocol, protocol)

      lp.unwrap()

      return protocol
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      const protos = new Uint8ArrayList(
        ...protocols.map(p => encode.single(uint8ArrayFromString(`${p}\n`))),
        uint8ArrayFromString('\n')
      )

      log.trace('respond with "%s" for %s', protocols, protocol)
      await lp.write(protos, options)
      log.trace('responded with "%s" for %s', protocols, protocol)
      continue
    }

    log.trace('respond with "na" for "%s"', protocol)
    await lp.write(uint8ArrayFromString('na\n'), options)
    log('responded with "na" for "%s"', protocol)
  }
}
