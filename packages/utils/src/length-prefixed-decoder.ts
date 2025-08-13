import { InvalidParametersError } from "@libp2p/interface"
import { Uint8ArrayList } from "uint8arraylist"
import * as varint from 'uint8-varint'
import { InvalidMessageLengthError } from "./stream-utils.ts"

const DEFAULT_MAX_BUFFER_SIZE = 1024 * 1024 * 4
const DEFAULT_MAX_DATA_LENGTH = 1024 * 1024 * 4

export interface LengthPrefixedDecoderInit {
  /**
   * How large the internal buffer is allowed to grow - attempting to store more
   * data than this will throw
   */
  maxBufferSize?: number

  /**
   * Throw an error if the message that would be read from the buffer is larger
   * than this value
   */
  maxDataLength?: number

  /**
   * Read a varint from the buffer
   */
  lengthDecoder?: (data: Uint8ArrayList | Uint8Array) => number

  /**
   * Return how many bytes it takes to encode the passed value
   */
  encodingLength?: (length: number) => number
}

/**
 * Decode length-prefixed data from a buffer
 */
export class LengthPrefixedDecoder {
  private readonly buffer: Uint8ArrayList
  private readonly maxBufferSize: number
  private readonly lengthDecoder: (data: Uint8ArrayList | Uint8Array) => number
  private readonly maxDataLength: number
  private readonly encodingLength: (length: number) => number

  constructor (init: LengthPrefixedDecoderInit = {}) {
    this.buffer = new Uint8ArrayList()
    this.maxBufferSize = init.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE
    this.maxDataLength = init.maxDataLength ?? DEFAULT_MAX_DATA_LENGTH
    this.lengthDecoder = init.lengthDecoder ?? varint.decode
    this.encodingLength = init.encodingLength ?? varint.encodingLength
  }

  /**
   * Decodes length-prefixed data
   */
  * decode (buf: Uint8Array | Uint8ArrayList): Generator<Uint8ArrayList> {
    this.buffer.append(buf)

    if (this.buffer.byteLength > this.maxBufferSize) {
      throw new InvalidParametersError(`Buffer length limit exceeded - ${this.buffer.byteLength}/${this.maxBufferSize}`)
    }

    // Loop to consume as many bytes from the buffer as possible
    // Eg: when a single chunk contains several frames
    while (true) {
      let dataLength: number

      try {
        dataLength = this.lengthDecoder(this.buffer)
      } catch (err) {
        if (err instanceof RangeError) {
          // ignore errors where we don't have enough data to read the length
          // prefix
          break
        }

        throw err
      }

      if (dataLength < 0 || dataLength > this.maxDataLength) {
        throw new InvalidMessageLengthError('Invalid message length')
      }

      const lengthLength = this.encodingLength(dataLength)
      const chunkLength = lengthLength + dataLength

      if (this.buffer.byteLength >= chunkLength) {
        const buf = this.buffer.sublist(lengthLength, chunkLength)

        this.buffer.consume(chunkLength)

        if (buf.byteLength > 0) {
          yield buf
        }
      } else {
        break
      }
    }
  }
}
