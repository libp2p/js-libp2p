import { Uint8ArrayList } from 'uint8arraylist'
import { InvalidFrameError } from './errors.js'
import { FrameType, HEADER_LENGTH, YAMUX_VERSION } from './frame.js'
import type { FrameHeader } from './frame.js'

export interface Frame {
  header: FrameHeader
  data?: Uint8ArrayList
}

export interface DataFrame {
  header: FrameHeader
  data: Uint8ArrayList
}

export function isDataFrame (frame: Frame): frame is DataFrame {
  return frame.header.type === FrameType.Data && frame.data !== null
}

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
    throw new InvalidFrameError('Invalid frame version')
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
  /** Buffer for in-progress frames */
  private readonly buffer: Uint8ArrayList

  constructor () {
    this.buffer = new Uint8ArrayList()
  }

  /**
   * Emits frames from the decoder source.
   *
   * Note: If `readData` is emitted, it _must_ be called before the next iteration
   * Otherwise an error is thrown
   */
  * emitFrames (buf: Uint8Array | Uint8ArrayList): Generator<Frame> {
    this.buffer.append(buf)

    // Loop to consume as many bytes from the buffer as possible
    // Eg: when a single chunk contains several frames
    while (true) {
      const frame = this.readFrame()

      if (frame === undefined) {
        break
      }

      yield frame
    }
  }

  private readFrame (): Frame | undefined {
    let frameSize = HEADER_LENGTH

    if (this.buffer.byteLength < HEADER_LENGTH) {
      // not enough data yet
      return
    }

    const header = decodeHeader(this.buffer.subarray(0, HEADER_LENGTH))

    if (header.type === FrameType.Data) {
      frameSize += header.length

      if (this.buffer.byteLength < frameSize) {
        // not enough data yet
        return
      }

      const data = this.buffer.sublist(HEADER_LENGTH, frameSize)
      this.buffer.consume(frameSize)

      return { header, data }
    }

    this.buffer.consume(frameSize)

    return { header }
  }
}
