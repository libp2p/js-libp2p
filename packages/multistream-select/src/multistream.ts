import { InvalidMessageError } from '@libp2p/interface'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { AbortOptions } from '@libp2p/interface'
import type { LengthPrefixedStream } from '@libp2p/utils'

const NewLine = uint8ArrayFromString('\n')

/**
 * Read a length-prefixed string from the passed stream, stripping the final newline character
 */
export async function readString (reader: LengthPrefixedStream, options?: AbortOptions): Promise<string> {
  const buf = await reader.read(options)
  const arr = buf.subarray()

  if (arr.byteLength === 0 || arr[arr.length - 1] !== NewLine[0]) {
    throw new InvalidMessageError('Missing newline')
  }

  return uint8ArrayToString(arr).trimEnd()
}
