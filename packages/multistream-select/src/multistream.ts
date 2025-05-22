import { InvalidMessageError } from '@libp2p/interface'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { AbortOptions, LoggerOptions } from '@libp2p/interface'
import type { LengthPrefixedStream } from 'it-length-prefixed-stream'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const NewLine = uint8ArrayFromString('\n')

/**
 * `write` encodes and writes a single buffer
 */
export async function write (writer: LengthPrefixedStream<Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array>>>, buffer: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<void> {
  await writer.write(buffer, options)
}

/**
 * `writeAll` behaves like `write`, except it encodes an array of items as a single write
 */
export async function writeAll (writer: LengthPrefixedStream<Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array>>>, buffers: Uint8Array[], options?: AbortOptions): Promise<void> {
  await writer.writeV(buffers, options)
}

/**
 * Read a length-prefixed buffer from the passed stream, stripping the final newline character
 */
export async function read (reader: LengthPrefixedStream<Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array>>>, options: AbortOptions & LoggerOptions): Promise<Uint8ArrayList> {
  const buf = await reader.read(options)

  if (buf.byteLength === 0 || buf.get(buf.byteLength - 1) !== NewLine[0]) {
    options.log.error('Invalid mss message - missing newline', buf)
    throw new InvalidMessageError('Missing newline')
  }

  return buf.sublist(0, -1) // Remove newline
}

/**
 * Read a length-prefixed string from the passed stream, stripping the final newline character
 */
export async function readString (reader: LengthPrefixedStream<Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array>>>, options: AbortOptions & LoggerOptions): Promise<string> {
  const buf = await read(reader, options)

  return uint8ArrayToString(buf.subarray())
}
