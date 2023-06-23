import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { encode } from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { unsigned } from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, Await, Bytes } from '@libp2p/interface'
import type { ByteStream } from '@libp2p/interface/connection'
import type { LengthEncoderFunction, LengthDecoderFunction } from 'it-length-prefixed'

const log = logger('libp2p:utils:stream:length-prefixed')

/**
 * The maximum amount of data we will read (default: 4MB)
 */
export const DEFAULT_MAX_DATA_LENGTH = 1024 * 1024 * 4

/**
 * Convenience methods for working with protobuf streams
 */
export interface LengthPrefixedStream <T extends ByteStream> {
  /**
   * Read the next length-prefixed number of bytes from the stream
   */
  read: (options?: AbortOptions) => Promise<Uint8ArrayList>

  /**
   * Write the passed bytes to the stream prefixed by their length
   */
  write: (input: Uint8Array | Uint8ArrayList, options?: AbortOptions) => Promise<void>

  /**
   * Returns the underlying stream - after unwrapping the read/write methods on
   * this interface can no longer be used.
   */
  unwrap: () => T
}

export interface LengthPrefixedOptions {
  // encoding opts
  lengthEncoder?: LengthEncoderFunction

  // decoding opts
  lengthDecoder?: LengthDecoderFunction
  maxDataLength?: number
}

const defaultLengthDecoder: LengthDecoderFunction = (buf) => {
  const len = unsigned.decode(buf)
  defaultLengthDecoder.bytes = unsigned.encodingLength(len)

  return len
}
defaultLengthDecoder.bytes = 0

interface LengthPrefixedDataOptions {
  maxDataLength?: number
  lengthDecoder?: LengthDecoderFunction
}

class LengthPrefixedData {
  public buffer: Uint8ArrayList
  private readonly maxDataLength: number
  private readonly maxLengthLength: number
  private dataLength?: number
  private readonly decodeLength: LengthDecoderFunction

  constructor (options: LengthPrefixedDataOptions) {
    this.buffer = new Uint8ArrayList()
    this.maxDataLength = options.maxDataLength ?? DEFAULT_MAX_DATA_LENGTH
    this.maxLengthLength = unsigned.encodingLength(this.maxDataLength)
    this.decodeLength = options.lengthDecoder ?? defaultLengthDecoder
  }

  append (chunk: Bytes): void {
    this.buffer.append(chunk)
  }

  read (): Uint8ArrayList | undefined {
    if (this.dataLength == null) {
      try {
        this.dataLength = this.decodeLength(this.buffer)
      } catch (err) {
        if (err instanceof RangeError) {
          // have not read enough data to decode an unsigned varint yet

          if (this.maxLengthLength != null && this.buffer.byteLength > this.maxLengthLength) {
            throw new CodeError('message length length too long', 'ERR_MSG_LENGTH_TOO_LONG')
          }

          return
        }

        // unexpected error, something went wrong!
        throw err
      }

      if (this.maxDataLength != null && this.dataLength > this.maxDataLength) {
        throw new CodeError('message length too long', 'ERR_MSG_DATA_TOO_LONG')
      }

      // trim the length from start of the buffer
      this.buffer.consume(this.decodeLength.bytes)
    }

    if (this.dataLength != null && this.buffer.byteLength >= this.dataLength) {
      const data = this.buffer.sublist(0, this.dataLength)
      this.buffer.consume(this.dataLength)

      return data
    }
  }
}

export function lengthPrefixed <T extends ByteStream> (stream: T, lpOptions: LengthPrefixedOptions = {}): LengthPrefixedStream<T> {
  const unwrapped = false
  const lpReader = new LengthPrefixedData(lpOptions)

  return {
    read: async (options: AbortOptions = {}) => {
      if (unwrapped) {
        throw new CodeError('Cannot read from stream - stream was already unwrapped', 'ERR_STREAM_UNWRAPPED')
      }

      const reader = stream.readable.getReader()
      const listener = (): void => {
        void reader.cancel(new Error('Aborted'))
          .catch(err => {
            log('error while cancelling reader', err)
          })
      }

      options.signal?.addEventListener('abort', listener)

      try {
        while (true) {
          const result = await reader.read()

          if (result.done) {
            throw new CodeError('unexpected end of input', 'ERR_UNEXPECTED_EOF')
          }

          lpReader.append(result.value)

          const buf = lpReader.read()

          if (buf != null) {
            return buf
          }
        }
      } finally {
        options.signal?.removeEventListener('abort', listener)
        reader.releaseLock()
      }
    },
    write: async (input, options?: AbortOptions) => {
      if (unwrapped) {
        throw new CodeError('Cannot write to stream - stream was already unwrapped', 'ERR_STREAM_UNWRAPPED')
      }

      const writer = stream.writable.getWriter()
      const listener = (): void => {
        void writer.abort(new Error('Aborted'))
          .catch(err => {
            log('error while aborting writer', err)
          })
      }

      try {
        await writer.ready
        await writer.write(encode.single(input, lpOptions).subarray())
      } finally {
        options?.signal?.removeEventListener('abort', listener)
        writer.releaseLock()
      }
    },
    unwrap: () => {
      if (lpReader.buffer.byteLength === 0) {
        return stream
      }

      // get a reader from the original stream
      const reader = stream.readable.getReader()

      // prepend any read data to the readable
      stream.readable = new ReadableStream({
        pull: async (controller) => {
          if (lpReader.buffer.byteLength > 0) {
            controller.enqueue(lpReader.buffer.subarray())
            lpReader.buffer.consume(lpReader.buffer.byteLength)

            return
          }

          const result = await reader.read()

          if (result.done) {
            reader.releaseLock()
            controller.close()
            return
          }

          controller.enqueue(result.value)
        },
        cancel: () => {
          reader.releaseLock()
        }
      })

      return stream
    }
  }
}

export function lengthPrefixedTransform (fn: (chunk: Uint8ArrayList) => Await<Bytes | undefined>, options: LengthPrefixedOptions = {}): ReadableWritablePair {
  const lpReader = new LengthPrefixedData(options)
  const queue = pushable()

  return {
    writable: new WritableStream({
      write: async (chunk, controller) => {
        try {
          lpReader.append(chunk)

          const buf = lpReader.read()

          if (buf == null) {
            return
          }

          const output = await fn(buf)

          if (output == null) {
            return
          }

          if (output instanceof Uint8Array) {
            queue.push(output)
            return
          }

          for (const buf of output) {
            queue.push(buf)
          }
        } catch (err) {
          controller.error(err)
        }
      },
      abort: (err: any) => {
        queue.end(err)
      },
      close: () => {
        queue.end()
      }
    }),
    readable: new ReadableStream({
      pull: async (controller) => {
        try {
          const next = await queue.next()

          if (next.done === true) {
            controller.close()
            return
          }

          controller.enqueue(next.value)
        } catch (err) {
          controller.error(err)
        }
      }
    })
  }
}

export function lengthPrefixedEncoderTransform (options: LengthPrefixedOptions = {}): ReadableWritablePair<Bytes, Uint8Array> {
  const queue = pushable<Uint8ArrayList>({
    objectMode: true
  })

  return {
    writable: new WritableStream<Bytes>({
      write: async (chunk, controller) => {
        try {
          queue.push(encode.single(chunk, options))
        } catch (err) {
          controller.error(err)
        }
      },
      abort: (err: any) => {
        queue.end(err)
      },
      close: () => {
        queue.end()
      }
    }),
    readable: new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          const next = await queue.next()

          if (next.done === true) {
            controller.close()
            return
          }

          if (next.value instanceof Uint8Array) {
            controller.enqueue(next.value)
          } else {
            for (const buf of next.value) {
              controller.enqueue(buf)
            }
          }
        } catch (err) {
          controller.error(err)
        }
      }
    })
  }
}

export function lengthPrefixedReader (fn: (buf: Uint8ArrayList) => Await<void>, options: LengthPrefixedDataOptions = {}): WritableStream<Bytes> {
  const lpReader = new LengthPrefixedData(options)

  return new WritableStream<Bytes>({
    write: async (chunk, controller) => {
      try {
        lpReader.append(chunk)

        const buf = lpReader.read()

        if (buf == null) {
          return
        }

        await fn(buf)
      } catch (err) {
        controller.error(err)
      }
    }
  })
}
