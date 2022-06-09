
import { Uint8ArrayList } from 'uint8arraylist'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import errCode from 'err-code'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import first from 'it-first'
import { abortableSource } from 'abortable-iterator'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Pushable } from 'it-pushable'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Source } from 'it-stream-types'
import type { Reader } from 'it-reader'

const NewLine = uint8ArrayFromString('\n')

export function encode (buffer: Uint8Array | Uint8ArrayList): Uint8Array {
  const list = new Uint8ArrayList(buffer, NewLine)

  return lp.encode.single(list).slice()
}

/**
 * `write` encodes and writes a single buffer
 */
export function write (writer: Pushable<Uint8Array>, buffer: Uint8Array | Uint8ArrayList) {
  writer.push(encode(buffer).slice())
}

/**
 * `writeAll` behaves like `write`, except it encodes an array of items as a single write
 */
export function writeAll (writer: Pushable<Uint8Array>, buffers: Uint8Array[]) {
  const list = new Uint8ArrayList()

  for (const buf of buffers) {
    list.append(encode(buf))
  }

  writer.push(list.slice())
}

export async function read (reader: Reader, options?: AbortOptions) {
  let byteLength = 1 // Read single byte chunks until the length is known
  const varByteSource = { // No return impl - we want the reader to remain readable
    [Symbol.asyncIterator]: () => varByteSource,
    next: async () => await reader.next(byteLength)
  }

  let input: Source<Uint8ArrayList> = varByteSource

  // If we have been passed an abort signal, wrap the input source in an abortable
  // iterator that will throw if the operation is aborted
  if (options?.signal != null) {
    input = abortableSource(varByteSource, options.signal)
  }

  // Once the length has been parsed, read chunk for that length
  const onLength = (l: number) => { byteLength = l }

  const buf = await pipe(
    input,
    lp.decode({ onLength }),
    async (source) => await first(source)
  )

  if (buf == null) {
    throw errCode(new Error('no buffer returned'), 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  if (buf[buf.length - 1] !== NewLine[0]) {
    throw errCode(new Error('missing newline'), 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  return buf.slice(0, -1) // Remove newline
}

export async function readString (reader: Reader, options?: AbortOptions) {
  const buf = await read(reader, options)

  return uint8ArrayToString(buf)
}
