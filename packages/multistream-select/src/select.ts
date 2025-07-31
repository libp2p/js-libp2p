import { UnsupportedProtocolError } from '@libp2p/interface'
import { lpStream } from '@libp2p/utils'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_PROTOCOL_LENGTH } from './constants.js'
import { readString } from './multistream.js'
import { PROTOCOL_ID } from './index.js'
import type { MultistreamSelectInit } from './index.js'
import type { MessageStream } from '@libp2p/interface'

/**
 * Negotiate a protocol to use from a list of protocols.
 *
 * @param stream - A duplex iterable stream to dial on
 * @param protocols - A list of protocols (or single protocol) to negotiate with. Protocols are attempted in order until a match is made.
 * @param options - An options object containing an AbortSignal and an optional boolean `writeBytes` - if this is true, `Uint8Array`s will be written into `duplex`, otherwise `Uint8ArrayList`s will
 * @returns A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.
 * @example
 *
 * ```TypeScript
 * import { pipe } from 'it-pipe'
 * import * as mss from '@libp2p/multistream-select'
 * import { Mplex } from '@libp2p/mplex'
 *
 * const muxer = new Mplex()
 * const muxedStream = muxer.newStream()
 *
 * // mss.select(protocol(s))
 * // Select from one of the passed protocols (in priority order)
 * // Returns selected stream and protocol
 * const { stream: dhtStream, protocol } = await mss.select(muxedStream, [
 *   // This might just be different versions of DHT, but could be different implementations
 *   '/ipfs-dht/2.0.0', // Most of the time this will probably just be one item.
 *   '/ipfs-dht/1.0.0'
 * ])
 *
 * // Typically this stream will be passed back to the caller of libp2p.dialProtocol
 * //
 * // ...it might then do something like this:
 * // try {
 * //   await pipe(
 * //     [uint8ArrayFromString('Some DHT data')]
 * //     dhtStream,
 * //     async source => {
 * //       for await (const chunk of source)
 * //         // DHT response data
 * //     }
 * //   )
 * // } catch (err) {
 * //   // Error in stream
 * // }
 * ```
 */
export async function select <Stream extends MessageStream> (stream: Stream, protocols: string | string[], options: MultistreamSelectInit = {}): Promise<string> {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]

  const log = stream.log.newScope('mss:select')

  const lp = lpStream(stream, {
    ...options,
    maxDataLength: MAX_PROTOCOL_LENGTH,
    stopPropagation: true
  })
  const protocol = protocols.shift()

  if (protocol == null) {
    throw new Error('At least one protocol must be specified')
  }

  log.trace('write ["%s", "%s"]', PROTOCOL_ID, protocol)
  const p1 = uint8ArrayFromString(`${PROTOCOL_ID}\n`)
  const p2 = uint8ArrayFromString(`${protocol}\n`)
  await lp.writeV([p1, p2], options)

  log.trace('reading multistream-select header')
  let response = await readString(lp, options)
  log.trace('read "%s"', response)

  // Read the protocol response if we got the protocolId in return
  if (response === PROTOCOL_ID) {
    log.trace('reading protocol response')
    response = await readString(lp, options)
    log.trace('read "%s"', response)
  }

  // We're done
  if (response === protocol) {
    log.trace('selected "%s" as first offer', response)
    lp.unwrap()

    return protocol
  }

  // We haven't gotten a valid ack, try the other protocols
  for (const protocol of protocols) {
    log.trace('write "%s"', protocol)
    await lp.write(uint8ArrayFromString(`${protocol}\n`), options)

    log.trace('reading protocol response')
    const response = await readString(lp, options)
    log.trace('read "%s" for "%s"', response, protocol)

    if (response === protocol) {
      log.trace('selected "%s" after negotiation', response)
      lp.unwrap()

      return protocol
    }
  }

  throw new UnsupportedProtocolError('protocol selection failed')
}
