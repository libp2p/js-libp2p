import { reader as createReader } from 'it-reader'
import { logger } from '@libp2p/logger'
import * as multistream from './multistream.js'
import { handshake } from 'it-handshake'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Duplex } from 'it-stream-types'
import type { AbortOptions } from '@libp2p/interfaces'

const log = logger('libp2p:mss:ls')

export async function ls (stream: Duplex<Uint8Array>, options?: AbortOptions): Promise<{ stream: Duplex<Uint8Array>, protocols: string[] }> {
  const { reader, writer, rest, stream: shakeStream } = handshake(stream)

  log('write "ls"')
  multistream.write(writer, uint8ArrayFromString('ls'))
  rest()

  // Next message from remote will be (e.g. for 2 protocols):
  // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
  const res = await multistream.read(reader, options)

  // After reading response we have:
  // <varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
  const protocolsReader = createReader([res])
  const protocols: string[] = []

  // Decode each of the protocols from the reader
  await pipe(
    protocolsReader,
    lp.decode(),
    async (source) => {
      for await (const protocol of source) {
        // Remove the newline
        protocols.push(uint8ArrayToString(protocol.slice(0, -1)))
      }
    }
  )

  const output = { stream: shakeStream, protocols }

  return output
}
