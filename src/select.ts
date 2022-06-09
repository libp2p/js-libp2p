import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import * as multistream from './multistream.js'
import { handshake } from 'it-handshake'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Duplex } from 'it-stream-types'

const log = logger('libp2p:mss:select')

export async function select (stream: Duplex<Uint8Array>, protocols: string | string[], protocolId?: string, options?: AbortOptions) {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]
  const { reader, writer, rest, stream: shakeStream } = handshake(stream)

  const protocol = protocols.shift()

  if (protocol == null) {
    throw new Error('At least one protocol must be specified')
  }

  if (protocolId != null) {
    log('select: write ["%s", "%s"]', protocolId, protocol)
    multistream.writeAll(writer, [uint8ArrayFromString(protocolId), uint8ArrayFromString(protocol)])
  } else {
    log('select: write "%s"', protocol)
    multistream.write(writer, uint8ArrayFromString(protocol))
  }

  let response = await multistream.readString(reader, options)
  log('select: read "%s"', response)

  // Read the protocol response if we got the protocolId in return
  if (response === protocolId) {
    response = await multistream.readString(reader, options)
    log('select: read "%s"', response)
  }

  // We're done
  if (response === protocol) {
    rest()
    return { stream: shakeStream, protocol }
  }

  // We haven't gotten a valid ack, try the other protocols
  for (const protocol of protocols) {
    log('select: write "%s"', protocol)
    multistream.write(writer, uint8ArrayFromString(protocol))
    const response = await multistream.readString(reader, options)
    log('select: read "%s" for "%s"', response, protocol)

    if (response === protocol) {
      rest() // End our writer so others can start writing to stream
      return { stream: shakeStream, protocol }
    }
  }

  rest()
  throw errCode(new Error('protocol selection failed'), 'ERR_UNSUPPORTED_PROTOCOL')
}
