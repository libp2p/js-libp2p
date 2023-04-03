
import { Uint8ArrayList } from 'uint8arraylist'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { CodeError } from '@libp2p/interfaces/errors'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import first from 'it-first'
import { abortableSource } from 'abortable-iterator'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Pushable } from 'it-pushable'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Source } from 'it-stream-types'
import type { Reader } from 'it-reader'
import type { MultistreamSelectInit } from '.'
import { MAX_PROTOCOL_LENGTH } from './constants.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:mss')

const NewLine = uint8ArrayFromString('\n')

export function encode (buffer: Uint8Array | Uint8ArrayList): Uint8ArrayList {
  const list = new Uint8ArrayList(buffer, NewLine)

  return lp.encode.single(list)
}

/**
 * `write` encodes and writes a single buffer
 */
export function write (writer: Pushable<any>, buffer: Uint8Array | Uint8ArrayList, options: MultistreamSelectInit = {}): void {
  const encoded = encode(buffer)

  if (options.writeBytes === true) {
    writer.push(encoded.subarray())
  } else {
    writer.push(encoded)
  }
}

/**
 * `writeAll` behaves like `write`, except it encodes an array of items as a single write
 */
export function writeAll (writer: Pushable<any>, buffers: Uint8Array[], options: MultistreamSelectInit = {}): void {
  const list = new Uint8ArrayList()

  for (const buf of buffers) {
    list.append(encode(buf))
  }

  if (options.writeBytes === true) {
    writer.push(list.subarray())
  } else {
    writer.push(list)
  }
}

export async function read (reader: Reader, options?: AbortOptions): Promise<Uint8ArrayList> {
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
  const onLength = (l: number): void => {
    byteLength = l
  }

  const buf = await pipe(
    input,
    (source) => lp.decode(source, { onLength, maxDataLength: MAX_PROTOCOL_LENGTH }),
    async (source) => await first(source)
  )

  if (buf == null || buf.length === 0) {
    throw new CodeError('no buffer returned', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  if (buf.get(buf.byteLength - 1) !== NewLine[0]) {
    log.error('Invalid mss message - missing newline - %s', buf.subarray())
    throw new CodeError('missing newline', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  return buf.sublist(0, -1) // Remove newline
}

export async function readString (reader: Reader, options?: AbortOptions): Promise<string> {
  const buf = await read(reader, options)

  return uint8ArrayToString(buf.subarray())
}
