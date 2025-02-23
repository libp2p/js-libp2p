import { UnsupportedProtocolError } from '@libp2p/interface'
import { lpStream } from 'it-length-prefixed-stream'
import pDefer from 'p-defer'
import { raceSignal } from 'race-signal'
import * as varint from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_PROTOCOL_LENGTH } from './constants.js'
import * as multistream from './multistream.js'
import { PROTOCOL_ID } from './index.js'
import type { MultistreamSelectInit, ProtocolStream } from './index.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'

export interface SelectStream extends Duplex<any, any, any> {
  readStatus?: string
  closeWrite?(options?: AbortOptions): Promise<void>
  closeRead?(options?: AbortOptions): Promise<void>
  close?(options?: AbortOptions): Promise<void>
}

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
export async function select <Stream extends SelectStream> (stream: Stream, protocols: string | string[], options: MultistreamSelectInit): Promise<ProtocolStream<Stream>> {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]

  if (protocols.length === 1 && options.negotiateFully === false) {
    return optimisticSelect(stream, protocols[0], options)
  }

  const lp = lpStream(stream, {
    ...options,
    maxDataLength: MAX_PROTOCOL_LENGTH
  })
  const protocol = protocols.shift()

  if (protocol == null) {
    throw new Error('At least one protocol must be specified')
  }

  options.log.trace('select: write ["%s", "%s"]', PROTOCOL_ID, protocol)
  const p1 = uint8ArrayFromString(`${PROTOCOL_ID}\n`)
  const p2 = uint8ArrayFromString(`${protocol}\n`)
  await multistream.writeAll(lp, [p1, p2], options)

  options.log.trace('select: reading multistream-select header')
  let response = await multistream.readString(lp, options)
  options.log.trace('select: read "%s"', response)

  // Read the protocol response if we got the protocolId in return
  if (response === PROTOCOL_ID) {
    options.log.trace('select: reading protocol response')
    response = await multistream.readString(lp, options)
    options.log.trace('select: read "%s"', response)
  }

  // We're done
  if (response === protocol) {
    return { stream: lp.unwrap(), protocol }
  }

  // We haven't gotten a valid ack, try the other protocols
  for (const protocol of protocols) {
    options.log.trace('select: write "%s"', protocol)
    await multistream.write(lp, uint8ArrayFromString(`${protocol}\n`), options)
    options.log.trace('select: reading protocol response')
    const response = await multistream.readString(lp, options)
    options.log.trace('select: read "%s" for "%s"', response, protocol)

    if (response === protocol) {
      return { stream: lp.unwrap(), protocol }
    }
  }

  throw new UnsupportedProtocolError('protocol selection failed')
}

/**
 * Optimistically negotiates a protocol.
 *
 * It *does not* block writes waiting for the other end to respond. Instead, it
 * simply assumes the negotiation went successfully and starts writing data.
 *
 * Use when it is known that the receiver supports the desired protocol.
 */
function optimisticSelect <Stream extends SelectStream> (stream: Stream, protocol: string, options: MultistreamSelectInit): ProtocolStream<Stream> {
  const originalSink = stream.sink.bind(stream)
  const originalSource = stream.source

  let negotiated = false
  let negotiating = false
  const doneNegotiating = pDefer()

  let sentProtocol = false
  let sendingProtocol = false
  const doneSendingProtocol = pDefer()

  let readProtocol = false
  let readingProtocol = false
  const doneReadingProtocol = pDefer()

  const lp = lpStream({
    sink: originalSink,
    source: originalSource
  }, {
    ...options,
    maxDataLength: MAX_PROTOCOL_LENGTH
  })

  stream.sink = async source => {
    const { sink } = lp.unwrap()

    await sink(async function * () {
      let sentData = false

      for await (const buf of source) {
        // started reading before the source yielded, wait for protocol send
        if (sendingProtocol) {
          await doneSendingProtocol.promise
        }

        // writing before reading, send the protocol and the first chunk of data
        if (!sentProtocol) {
          sendingProtocol = true

          options.log.trace('optimistic: write ["%s", "%s", data(%d)] in sink', PROTOCOL_ID, protocol, buf.byteLength)

          const protocolString = `${protocol}\n`

          // send protocols in first chunk of data written to transport
          yield new Uint8ArrayList(
            Uint8Array.from([19]), // length of PROTOCOL_ID plus newline
            uint8ArrayFromString(`${PROTOCOL_ID}\n`),
            varint.encode(protocolString.length),
            uint8ArrayFromString(protocolString),
            buf
          ).subarray()

          options.log.trace('optimistic: wrote ["%s", "%s", data(%d)] in sink', PROTOCOL_ID, protocol, buf.byteLength)

          sentProtocol = true
          sendingProtocol = false
          doneSendingProtocol.resolve()

          // read the negotiation response but don't block more sending
          negotiate()
            .catch(err => {
              options.log.error('could not finish optimistic protocol negotiation of %s', protocol, err)
            })
        } else {
          yield buf
        }

        sentData = true
      }

      // special case - the source passed to the sink has ended but we didn't
      // negotiated the protocol yet so do it now
      if (!sentData) {
        await negotiate()
      }
    }())
  }

  async function negotiate (): Promise<void> {
    if (negotiating) {
      options.log.trace('optimistic: already negotiating %s stream', protocol)
      await doneNegotiating.promise
      return
    }

    negotiating = true

    try {
      // we haven't sent the protocol yet, send it now
      if (!sentProtocol) {
        options.log.trace('optimistic: doing send protocol for %s stream', protocol)
        await doSendProtocol()
      }

      // if we haven't read the protocol response yet, do it now
      if (!readProtocol) {
        options.log.trace('optimistic: doing read protocol for %s stream', protocol)
        await doReadProtocol()
      }
    } finally {
      negotiating = false
      negotiated = true
      doneNegotiating.resolve()
    }
  }

  async function doSendProtocol (): Promise<void> {
    if (sendingProtocol) {
      await doneSendingProtocol.promise
      return
    }

    sendingProtocol = true

    try {
      options.log.trace('optimistic: write ["%s", "%s", data] in source', PROTOCOL_ID, protocol)
      await lp.writeV([
        uint8ArrayFromString(`${PROTOCOL_ID}\n`),
        uint8ArrayFromString(`${protocol}\n`)
      ])
      options.log.trace('optimistic: wrote ["%s", "%s", data] in source', PROTOCOL_ID, protocol)
    } finally {
      sentProtocol = true
      sendingProtocol = false
      doneSendingProtocol.resolve()
    }
  }

  async function doReadProtocol (): Promise<void> {
    if (readingProtocol) {
      await doneReadingProtocol.promise
      return
    }

    readingProtocol = true

    try {
      options.log.trace('optimistic: reading multistream select header')
      let response = await multistream.readString(lp, options)
      options.log.trace('optimistic: read multistream select header "%s"', response)

      if (response === PROTOCOL_ID) {
        response = await multistream.readString(lp, options)
      }

      options.log.trace('optimistic: read protocol "%s", expecting "%s"', response, protocol)

      if (response !== protocol) {
        throw new UnsupportedProtocolError('protocol selection failed')
      }
    } finally {
      readProtocol = true
      readingProtocol = false
      doneReadingProtocol.resolve()
    }
  }

  stream.source = (async function * () {
    // make sure we've done protocol negotiation before we read stream data
    await negotiate()

    options.log.trace('optimistic: reading data from "%s" stream', protocol)
    yield * lp.unwrap().source
  })()

  if (stream.closeRead != null) {
    const originalCloseRead = stream.closeRead.bind(stream)

    stream.closeRead = async (opts) => {
      // we need to read & write to negotiate the protocol so ensure we've done
      // this before closing the readable end of the stream
      if (!negotiated) {
        await negotiate().catch(err => {
          options.log.error('could not negotiate protocol before close read', err)
        })
      }

      // protocol has been negotiated, ok to close the readable end
      await originalCloseRead(opts)
    }
  }

  if (stream.closeWrite != null) {
    const originalCloseWrite = stream.closeWrite.bind(stream)

    stream.closeWrite = async (opts) => {
      // we need to read & write to negotiate the protocol so ensure we've done
      // this before closing the writable end of the stream
      if (!negotiated) {
        await negotiate().catch(err => {
          options.log.error('could not negotiate protocol before close write', err)
        })
      }

      // protocol has been negotiated, ok to close the writable end
      await originalCloseWrite(opts)
    }
  }

  if (stream.close != null) {
    const originalClose = stream.close.bind(stream)

    stream.close = async (opts) => {
      // if we are in the process of negotiation, let it finish before closing
      // because we may have unsent early data
      const tasks = []

      if (sendingProtocol) {
        tasks.push(doneSendingProtocol.promise)
      }

      if (readingProtocol) {
        tasks.push(doneReadingProtocol.promise)
      }

      if (tasks.length > 0) {
        // let the in-flight protocol negotiation finish gracefully
        await raceSignal(
          Promise.all(tasks),
          opts?.signal
        )
      } else {
        // no protocol negotiation attempt has occurred so don't start one
        negotiated = true
        negotiating = false
        doneNegotiating.resolve()
      }

      // protocol has been negotiated, ok to close the writable end
      await originalClose(opts)
    }
  }

  return {
    stream,
    protocol
  }
}
