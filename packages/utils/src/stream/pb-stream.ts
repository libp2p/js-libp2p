import { pushable } from 'it-pushable'
import { lengthPrefixed, type LengthPrefixedOptions, lengthPrefixedReader, lengthPrefixedTransform } from './length-prefixed.js'
import type { Await, Bytes } from '@libp2p/interface'
import type { ByteStream } from '@libp2p/interface/connection'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * A protobuf decoder - takes a byte array and returns an object
 */
export interface Decoder<T> {
  (data: Uint8Array | Uint8ArrayList): T
}

/**
 * A protobuf encoder - takes an object and returns a byte array
 */
export interface Encoder<T> {
  (data: T): Uint8Array
}

export interface Codec<A, B = A> {
  decode: Decoder<A>
  encode: Encoder<B>
}

/**
 * A message reader/writer that only uses one type of message
 */
export interface MessageStream <T, S extends ByteStream = ByteStream> {
  /**
   * Read a message from the stream
   */
  read: (options?: AbortOptions) => Promise<T>

  /**
   * Write a message to the stream
   */
  write: (d: T, options?: AbortOptions) => Promise<void>

  /**
   * Unwrap the underlying protobuf stream
   */
  unwrap: () => ProtobufStream<S>
}

/**
 * Convenience methods for working with protobuf streams
 */
export interface ProtobufStream <S extends ByteStream = ByteStream> {
  /**
   * Read the next length-prefixed byte array from the stream and decode it as the passed protobuf format
   */
  read: <T>(proto: { decode: Decoder<T> }, options?: AbortOptions) => Promise<T>

  /**
   * Encode the passed object as a protobuf message and write it's length-prefixed bytes tot he stream
   */
  write: <T>(data: T, proto: { encode: Encoder<T> }, options?: AbortOptions) => Promise<void>

  /**
   * Returns an object with read/write methods for operating on one specific type of protobuf message
   */
  pb: <T> (proto: { encode: Encoder<T>, decode: Decoder<T> }) => MessageStream<T, S>

  /**
   * Returns the underlying stream
   */
  unwrap: () => S
}

export function pbStream <T extends ByteStream = ByteStream> (stream: T, options: LengthPrefixedOptions = {}): ProtobufStream<T> {
  const lp = lengthPrefixed(stream, options)

  const W: ProtobufStream<any> = {
    read: async (proto, options) => {
      // readLP, decode
      const value = await lp.read(options)

      if (value == null) {
        throw new Error('Value is null')
      }

      return proto.decode(value)
    },
    write: async (data, proto, options) => {
      // encode, writeLP
      await lp.write(proto.encode(data), options)
    },
    pb: (proto) => {
      return {
        read: async () => W.read(proto),
        write: async (d) => W.write(d, proto),
        unwrap: () => W
      }
    },
    unwrap: () => {
      return lp.unwrap()
    }
  }

  return W
}

export function pbTransform <Input, Output = Input> (fn: (message: Input) => Await<Output | undefined>, codec: Codec<Input, Output>, options?: LengthPrefixedOptions): ReadableWritablePair {
  return lengthPrefixedTransform(async (buf) => {
    const message = codec.decode(buf)

    const response = await fn(message)

    if (response == null) {
      return
    }

    return codec.encode(response)
  }, options)
}

export function pbEncoderTransform <T> (codec: Codec<T>): ReadableWritablePair<Uint8Array, T> {
  const queue = pushable()

  return {
    writable: new WritableStream<T>({
      write: (chunk, controller) => {
        try {
          const buf = codec.encode(chunk)

          queue.push(buf)
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

export function pbReader <T> (fn: (message: T) => Await<void>, codec: Codec<T>, options: LengthPrefixedOptions = {}): WritableStream<Bytes> {
  return lengthPrefixedReader(async (buf) => {
    const message = codec.decode(buf)

    await fn(message)
  }, options)
}
