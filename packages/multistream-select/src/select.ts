import { CodeError } from '@libp2p/interface/errors'
import { lpStream } from 'it-length-prefixed-stream'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_PROTOCOL_LENGTH } from './constants.js'
import * as multistream from './multistream.js'
import { PROTOCOL_ID } from './index.js'
import type { MultistreamSelectInit, ProtocolStream } from './index.js'
import type { Duplex } from 'it-stream-types'

/**
 * Negotiate a protocol to use from a list of protocols.
 *
 * @param stream - A duplex iterable stream to dial on
 * @param protocols - A list of protocols (or single protocol) to negotiate with. Protocols are attempted in order until a match is made.
 * @param options - An options object containing an AbortSignal and an optional boolean `writeBytes` - if this is true, `Uint8Array`s will be written into `duplex`, otherwise `Uint8ArrayList`s will
 * @returns A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.
 * @example
 *
 * ```js
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
 *   // This might just be different versions of DHT, but could be different impls
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
export async function select <Stream extends Duplex<any, any, any>> (stream: Stream, protocols: string | string[], options: MultistreamSelectInit): Promise<ProtocolStream<Stream>> {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]
  const lp = lpStream(stream, {
    maxDataLength: MAX_PROTOCOL_LENGTH
  })
  const protocol = protocols.shift()

  if (protocol == null) {
    throw new Error('At least one protocol must be specified')
  }

  options?.log.trace('select: write ["%s", "%s"]', PROTOCOL_ID, protocol)
  const p1 = uint8ArrayFromString(`${PROTOCOL_ID}\n`)
  const p2 = uint8ArrayFromString(`${protocol}\n`)
  await multistream.writeAll(lp, [p1, p2], options)

  options?.log.trace('select: reading multistream-select header')
  let response = await multistream.readString(lp, options)
  options?.log.trace('select: read "%s"', response)

  // Read the protocol response if we got the protocolId in return
  if (response === PROTOCOL_ID) {
    options?.log.trace('select: reading protocol response')
    response = await multistream.readString(lp, options)
    options?.log.trace('select: read "%s"', response)
  }

  // We're done
  if (response === protocol) {
    return { stream: lp.unwrap(), protocol }
  }

  // We haven't gotten a valid ack, try the other protocols
  for (const protocol of protocols) {
    options?.log.trace('select: write "%s"', protocol)
    await multistream.write(lp, uint8ArrayFromString(`${protocol}\n`), options)
    options?.log.trace('select: reading protocol response')
    const response = await multistream.readString(lp, options)
    options?.log.trace('select: read "%s" for "%s"', response, protocol)

    if (response === protocol) {
      return { stream: lp.unwrap(), protocol }
    }
  }

  throw new CodeError('protocol selection failed', 'ERR_UNSUPPORTED_PROTOCOL')
}

/**
 * Lazily negotiates a protocol.
 *
 * It *does not* block writes waiting for the other end to respond. Instead, it
 * simply assumes the negotiation went successfully and starts writing data.
 *
 * Use when it is known that the receiver supports the desired protocol.
 */
export function lazySelect <Stream extends Duplex<any, any, any>> (stream: Stream, protocol: string, options: MultistreamSelectInit): ProtocolStream<Stream> {
  const originalSink = stream.sink.bind(stream)
  const originalSource = stream.source

  const lp = lpStream({
    sink: originalSink,
    source: originalSource
  }, {
    maxDataLength: MAX_PROTOCOL_LENGTH
  })

  stream.sink = async source => {
    options?.log.trace('lazy: write ["%s", "%s"]', PROTOCOL_ID, protocol)

    await lp.writeV([
      uint8ArrayFromString(`${PROTOCOL_ID}\n`),
      uint8ArrayFromString(`${protocol}\n`)
    ])

    options?.log.trace('lazy: writing rest of "%s" stream', protocol)
    await lp.unwrap().sink(source)
  }

  stream.source = (async function * () {
    options?.log.trace('lazy: reading multistream select header')

    let response = await multistream.readString(lp, options)
    options?.log.trace('lazy: read multistream select header "%s"', response)

    if (response === PROTOCOL_ID) {
      response = await multistream.readString(lp, options)
    }

    options?.log.trace('lazy: read protocol "%s", expecting "%s"', response, protocol)

    if (response !== protocol) {
      throw new CodeError('protocol selection failed', 'ERR_UNSUPPORTED_PROTOCOL')
    }

    options?.log.trace('lazy: reading rest of "%s" stream', protocol)
    yield * lp.unwrap().source
  })()

  return {
    stream,
    protocol
  }
}
