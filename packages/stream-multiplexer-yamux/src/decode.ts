import { CodeError } from '@libp2p/interface/errors'
import { Uint8ArrayList } from 'uint8arraylist'
import { ERR_DECODE_INVALID_VERSION, ERR_DECODE_IN_PROGRESS } from './constants.js'
import { type FrameHeader, FrameType, HEADER_LENGTH, YAMUX_VERSION } from './frame.js'
import type { Source } from 'it-stream-types'

// used to bitshift in decoding
// native bitshift can overflow into a negative number, so we bitshift by multiplying by a power of 2
const twoPow24 = 2 ** 24

/**
 * Decode a header from the front of a buffer
 *
 * @param data - Assumed to have enough bytes for a header
 */
export function decodeHeader (data: Uint8Array): FrameHeader {
  if (data[0] !== YAMUX_VERSION) {
    throw new CodeError('Invalid frame version', ERR_DECODE_INVALID_VERSION)
  }
  return {
    type: data[1],
    flag: (data[2] << 8) + data[3],
    streamID: (data[4] * twoPow24) + (data[5] << 16) + (data[6] << 8) + data[7],
    length: (data[8] * twoPow24) + (data[9] << 16) + (data[10] << 8) + data[11]
  }
}

/**
 * Decodes yamux frames from a source
 */
export class Decoder {
  private readonly source: Source<Uint8Array | Uint8ArrayList>
  /** Buffer for in-progress frames */
  private readonly buffer: Uint8ArrayList
  /** Used to sanity check against decoding while in an inconsistent state */
  private frameInProgress: boolean

  constructor (source: Source<Uint8Array | Uint8ArrayList>) {
    // Normally, when entering a for-await loop with an iterable/async iterable, the only ways to exit the loop are:
    // 1. exhaust the iterable
    // 2. throw an error - slow, undesirable if there's not actually an error
    // 3. break or return - calls the iterable's `return` method, finalizing the iterable, no more iteration possible
    //
    // In this case, we want to enter (and exit) a for-await loop per chunked data frame and continue processing the iterable.
    // To do this, we strip the `return` method from the iterator and can now `break` early and continue iterating.
    // Exiting the main for-await is still possible via 1. and 2.
    this.source = returnlessSource(source)
    this.buffer = new Uint8ArrayList()
    this.frameInProgress = false
  }

  /**
   * Emits frames from the decoder source.
   *
   * Note: If `readData` is emitted, it _must_ be called before the next iteration
   * Otherwise an error is thrown
   */
  async * emitFrames (): AsyncGenerator<{ header: FrameHeader, readData?: () => Promise<Uint8ArrayList> }> {
    for await (const chunk of this.source) {
      this.buffer.append(chunk)

      // Loop to consume as many bytes from the buffer as possible
      // Eg: when a single chunk contains several frames
      while (true) {
        const header = this.readHeader()
        if (header === undefined) {
          break
        }

        const { type, length } = header
        if (type === FrameType.Data) {
          // This is a data frame, the frame body must still be read
          // `readData` must be called before the next iteration here
          this.frameInProgress = true
          yield {
            header,
            readData: this.readBytes.bind(this, length)
          }
        } else {
          yield { header }
        }
      }
    }
  }

  private readHeader (): FrameHeader | undefined {
    // Sanity check to ensure a header isn't read when another frame is partially decoded
    // In practice this shouldn't happen
    if (this.frameInProgress) {
      throw new CodeError('decoding frame already in progress', ERR_DECODE_IN_PROGRESS)
    }

    if (this.buffer.length < HEADER_LENGTH) {
      // not enough data yet
      return
    }

    const header = decodeHeader(this.buffer.subarray(0, HEADER_LENGTH))
    this.buffer.consume(HEADER_LENGTH)
    return header
  }

  private async readBytes (length: number): Promise<Uint8ArrayList> {
    if (this.buffer.length < length) {
      for await (const chunk of this.source) {
        this.buffer.append(chunk)

        if (this.buffer.length >= length) {
          // see note above, the iterator is not `return`ed here
          break
        }
      }
    }

    const out = this.buffer.sublist(0, length)
    this.buffer.consume(length)

    // The next frame can now be decoded
    this.frameInProgress = false

    return out
  }
}

/**
 * Strip the `return` method from a `Source`
 */
export function returnlessSource<T> (source: Source<T>): Source<T> {
  if ((source as Iterable<T>)[Symbol.iterator] !== undefined) {
    const iterator = (source as Iterable<T>)[Symbol.iterator]()
    iterator.return = undefined
    return {
      [Symbol.iterator] () { return iterator }
    }
  } else if ((source as AsyncIterable<T>)[Symbol.asyncIterator] !== undefined) {
    const iterator = (source as AsyncIterable<T>)[Symbol.asyncIterator]()
    iterator.return = undefined
    return {
      [Symbol.asyncIterator] () { return iterator }
    }
  } else {
    throw new Error('a source must be either an iterable or an async iterable')
  }
}
