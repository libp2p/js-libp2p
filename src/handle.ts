import { logger } from '@libp2p/logger'
import * as multistream from './multistream.js'
import { handshake } from 'it-handshake'
import { PROTOCOL_ID } from './constants.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Duplex } from 'it-stream-types'

const log = logger('libp2p:mss:handle')

export async function handle (stream: Duplex<Uint8Array>, protocols: string | string[], options?: AbortOptions) {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { writer, reader, rest, stream: shakeStream } = handshake(stream)

  while (true) {
    const protocol = await multistream.readString(reader, options)
    log('read "%s"', protocol)

    if (protocol === PROTOCOL_ID) {
      log('respond with "%s" for "%s"', PROTOCOL_ID, protocol)
      multistream.write(writer, uint8ArrayFromString(PROTOCOL_ID))
      continue
    }

    if (protocols.includes(protocol)) {
      multistream.write(writer, uint8ArrayFromString(protocol))
      log('respond with "%s" for "%s"', protocol, protocol)
      rest()
      return { stream: shakeStream, protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      multistream.write(writer, new Uint8ArrayList(...protocols.map(p => multistream.encode(uint8ArrayFromString(p)))))
      log('respond with "%s" for %s', protocols, protocol)
      continue
    }

    multistream.write(writer, uint8ArrayFromString('na'))
    log('respond with "na" for "%s"', protocol)
  }
}
