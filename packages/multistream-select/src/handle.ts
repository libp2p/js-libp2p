import { logger } from '@libp2p/logger'
import { lengthPrefixed } from '@libp2p/utils/stream'
import { unsigned } from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { MAX_PROTOCOL_LENGTH, PROTOCOL_ID } from './constants.js'
import type { AbortOptions } from '@libp2p/interface'
import type { ByteStream, Stream } from '@libp2p/interface/connection'

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
export async function handle <T extends ByteStream> (stream: T, protocols: string | string[], options?: AbortOptions): Promise<Stream> {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]

  if (protocols.length === 0) {
    throw new Error('At least one protocol must be specified')
  }

  const lpStream = lengthPrefixed(stream, {
    maxDataLength: MAX_PROTOCOL_LENGTH
  })

  while (true) {
    const request = await lpStream.read(options)
    const requestString = uint8ArrayToString(request.subarray())
    const remoteProtocols = requestString.trim().split('\n')

    for (const remoteProtocol of remoteProtocols) {
      log.trace('read "%s"', remoteProtocol)

      if (remoteProtocol === PROTOCOL_ID) {
        continue
      }

      if (protocols.includes(remoteProtocol)) {
        log.trace('respond with "%s" for "%s"', remoteProtocol, remoteProtocol)
        await lpStream.write(uint8ArrayFromString(`${PROTOCOL_ID}\n${remoteProtocol}\n`))

        const protocolStream: any = lpStream.unwrap()
        protocolStream.protocol = remoteProtocol

        return protocolStream
      }

      if (remoteProtocol === 'ls') {
        log.trace('respond to ls')

        const response = new Uint8ArrayList()

        // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
        for (const protocol of [PROTOCOL_ID, ...protocols]) {
          const buf = uint8ArrayFromString(protocol)
          response.append(unsigned.encode(buf.byteLength))
          response.append(uint8ArrayFromString(`${protocol}\n`))
        }

        response.append(uint8ArrayFromString('\n'))

        await lpStream.write(response.subarray())

        continue
      }

      log('respond with "na" for "%s"', remoteProtocol)
      await lpStream.write(uint8ArrayFromString(`${PROTOCOL_ID}\nna\n`))
    }
  }
}
