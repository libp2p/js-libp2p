import { StreamMessageEvent, StreamCloseEvent } from '@libp2p/interface'
import { pipe as itPipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { pEvent } from 'p-event'
import { raceEvent } from 'race-event'
import { raceSignal } from 'race-signal'
import * as varint from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { UnexpectedEOFError } from './errors.js'
import type { MessageStream } from '@libp2p/interface'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { Duplex, Source, Transform, Sink } from 'it-stream-types'

const DEFAULT_MAX_BUFFER_SIZE = 4_194_304

export class UnwrappedError extends Error {
  static name = 'UnwrappedError'
  name = 'UnwrappedError'
}

/**
 * The reported length of the next data message was not a positive integer
 */
export class InvalidMessageLengthError extends Error {
  name = 'InvalidMessageLengthError'
  code = 'ERR_INVALID_MSG_LENGTH'
}

/**
 * The reported length of the next data message was larger than the configured
 * max allowable value
 */
export class InvalidDataLengthError extends Error {
  name = 'InvalidDataLengthError'
  code = 'ERR_MSG_DATA_TOO_LONG'
}

/**
 * The varint used to specify the length of the next data message contained more
 * bytes than the configured max allowable value
 */
export class InvalidDataLengthLengthError extends Error {
  name = 'InvalidDataLengthLengthError'
  code = 'ERR_MSG_LENGTH_TOO_LONG'
}

export interface ByteStreamOpts {
  /**
   * Incoming bytes are buffered until read, this setting limits how many bytes
   * will be buffered.
   *
   * @default 4_194_304
   */
  maxBufferSize?: number

  /**
   * If true, prevent message events propagating after they have been received,
   *
   * This is useful for when there are be other observers of messages and the
   * caller does not wish to them to receive anything
   */
  stopPropagation?: boolean
}

export interface ReadBytesOptions extends AbortOptions {
  /**
   * If specified, read this number of bytes from the stream
   */
  bytes: number
}

export interface ByteStream<Stream extends MessageStream = MessageStream> {
  /**
   * Read bytes from the stream.
   *
   * If a required number of bytes is passed as an option, this will wait for
   * the underlying stream to supply that number of bytes, throwing an
   * `UnexpectedEOFError` if the stream closes before this happens.
   *
   * If no required number of bytes is passed, this will return `null` if the
   * underlying stream closes before supplying any bytes.
   */
  read(options: ReadBytesOptions): Promise<Uint8ArrayList>
  read(options?: AbortOptions): Promise<Uint8ArrayList | null>

  /**
   * Write the passed bytes to the stream
   */
  write(data: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<void>

  /**
   * After calling this method the bytestream can no longer be used. Any unread
   * data will be emitted as a message event during the microtask queue of the
   * current event loop tick.
   */
  unwrap(): Stream
}

export function byteStream <Stream extends MessageStream = MessageStream> (stream: Stream, opts?: ByteStreamOpts): ByteStream<Stream> {
  const maxBufferSize = opts?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE
  const readBuffer = new Uint8ArrayList()
  let hasBytes = Promise.withResolvers<void>()
  let unwrapped = false

  const onMessage = (evt: StreamMessageEvent): void => {
    if (opts?.stopPropagation === true) {
      evt.stopImmediatePropagation()
    }

    readBuffer.append(evt.data)

    if (readBuffer.byteLength > maxBufferSize) {
      const readBufferSize = readBuffer.byteLength
      readBuffer.consume(readBuffer.byteLength)
      hasBytes.reject(new Error(`Read buffer overflow - ${readBufferSize} > ${maxBufferSize}`))
    }

    hasBytes.resolve()
  }
  stream.addEventListener('message', onMessage)

  const onClose = (evt: StreamCloseEvent): void => {
    if (evt.error != null) {
      hasBytes.reject(evt.error)
    } else {
      hasBytes.resolve()
    }
  }
  stream.addEventListener('close', onClose)

  const onRemoteCloseWrite = (): void => {
    hasBytes.resolve()
  }
  stream.addEventListener('remoteCloseWrite', onRemoteCloseWrite)

  const byteStream: ByteStream<Stream> = {
    // @ts-expect-error options type prevents type inference
    async read (options?: ReadBytesOptions) {
      if (unwrapped === true) {
        throw new UnwrappedError('Stream was unwrapped')
      }

      if (stream.readStatus !== 'readable') {
        if (options?.bytes == null) {
          return null
        }

        throw new UnexpectedEOFError('Unexpected EOF - stream was not readable')
      }

      const bytesToRead = options?.bytes ?? 1

      while (true) {
        if (readBuffer.byteLength >= bytesToRead) {
          // if we are about to exit the loop this promise will not be awaited
          // so resolve it to prevent and unhandled promise rejections that may
          // occur
          hasBytes.resolve()

          break
        }

        await raceSignal(hasBytes.promise, options?.signal)

        if (stream.readStatus !== 'readable') {
          if (readBuffer.byteLength === 0 && options?.bytes == null) {
            return null
          }

          break
        }

        hasBytes = Promise.withResolvers<void>()
      }

      const toRead = options?.bytes ?? readBuffer.byteLength

      if (readBuffer.byteLength < toRead) {
        if (stream.readStatus !== 'readable') {
          throw new UnexpectedEOFError(`Unexpected EOF - stream status was "${stream.readStatus}" and not "readable"`)
        }

        return byteStream.read(options)
      }

      const output = readBuffer.sublist(0, toRead)
      readBuffer.consume(toRead)

      return output
    },
    async write (data: Uint8Array | Uint8ArrayList, options?: AbortOptions) {
      if (unwrapped === true) {
        throw new UnwrappedError('Stream was unwrapped')
      }

      const sendMore = stream.send(data)

      if (sendMore === false) {
        await raceEvent(stream, 'drain', options?.signal)
      }
    },
    unwrap () {
      // already unwrapped, just return the original stream
      if (unwrapped) {
        return stream
      }

      // only unwrap once
      unwrapped = true
      stream.removeEventListener('message', onMessage)
      stream.removeEventListener('close', onClose)
      stream.removeEventListener('remoteCloseWrite', onRemoteCloseWrite)

      // emit any unread data
      if (readBuffer.byteLength > 0) {
        stream.push(readBuffer)
      }

      return stream
    }
  }

  return byteStream
}

export interface LengthPrefixedStream<Stream extends MessageStream = MessageStream> {
  /**
   * Read the next length-prefixed number of bytes from the stream
   */
  read(options?: AbortOptions): Promise<Uint8ArrayList>

  /**
   * Write the passed bytes to the stream prefixed by their length
   */
  write(data: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<void>

  /**
   * Write passed list of bytes, prefix by their individual lengths to the stream as a single write
   */
  writeV(input: Array<Uint8Array | Uint8ArrayList>, options?: AbortOptions): Promise<void>

  /**
   * Returns the underlying stream
   */
  unwrap(): Stream
}

export interface LengthPrefixedStreamOpts extends ByteStreamOpts {
  lengthEncoder (value: number): Uint8ArrayList | Uint8Array
  lengthDecoder (data: Uint8ArrayList): number
  maxLengthLength: number
  maxDataLength: number
}

export function lpStream <Stream extends MessageStream = MessageStream> (stream: Stream, opts: Partial<LengthPrefixedStreamOpts> = {}): LengthPrefixedStream<Stream> {
  const bytes = byteStream(stream, opts)

  if (opts.maxDataLength != null && opts.maxLengthLength == null) {
    // if max data length is set but max length length is not, calculate the
    // max length length needed to encode max data length
    opts.maxLengthLength = varint.encodingLength(opts.maxDataLength)
  }

  const decodeLength = opts?.lengthDecoder ?? varint.decode
  const encodeLength = opts?.lengthEncoder ?? varint.encode

  const lpStream: LengthPrefixedStream<Stream> = {
    async read (options?: AbortOptions) {
      let dataLength: number = -1
      const lengthBuffer = new Uint8ArrayList()

      while (true) {
        const buf = await bytes.read({
          ...options,
          bytes: 1
        })

        // the underlying resource closed gracefully
        if (buf == null) {
          break
        }

        // read one byte at a time until we can decode a varint
        lengthBuffer.append(buf)

        try {
          dataLength = decodeLength(lengthBuffer)
        } catch (err) {
          if (err instanceof RangeError) {
            continue
          }

          throw err
        }

        if (dataLength < 0) {
          throw new InvalidMessageLengthError('Invalid message length')
        }

        if (opts?.maxLengthLength != null && lengthBuffer.byteLength > opts.maxLengthLength) {
          throw new InvalidDataLengthLengthError(`Message length length too long - ${lengthBuffer.byteLength} > ${opts.maxLengthLength}`)
        }

        if (dataLength > -1) {
          break
        }
      }

      if (opts?.maxDataLength != null && dataLength > opts.maxDataLength) {
        throw new InvalidDataLengthError(`Message length too long - ${dataLength} > ${opts.maxDataLength}`)
      }

      const buf = await bytes.read({
        ...options,
        bytes: dataLength
      })

      if (buf == null) {
        throw new UnexpectedEOFError(`Unexpected EOF - tried to read ${dataLength} bytes but the stream closed`)
      }

      if (buf.byteLength !== dataLength) {
        throw new UnexpectedEOFError(`Unexpected EOF - read ${buf.byteLength}/${dataLength} bytes before the stream closed`)
      }

      return buf
    },
    async write (data, options?: AbortOptions) {
      // encode, write
      await bytes.write(new Uint8ArrayList(encodeLength(data.byteLength), data), options)
    },
    async writeV (data, options?: AbortOptions) {
      const list = new Uint8ArrayList(
        ...data.flatMap(buf => ([encodeLength(buf.byteLength), buf]))
      )

      // encode, write
      await bytes.write(list, options)
    },
    unwrap () {
      return bytes.unwrap()
    }
  }

  return lpStream
}

/**
 * A protobuf decoder - takes a byte array and returns an object
 */
export interface ProtobufDecoder<T> {
  (data: Uint8Array | Uint8ArrayList): T
}

/**
 * A protobuf encoder - takes an object and returns a byte array
 */
export interface ProtobufEncoder<T> {
  (data: T): Uint8Array
}

/**
 * Convenience methods for working with protobuf streams
 */
export interface ProtobufStream <Stream extends MessageStream = MessageStream> {
  /**
   * Read the next length-prefixed byte array from the stream and decode it as the passed protobuf format
   */
  read<T>(proto: { decode: ProtobufDecoder<T> }, options?: AbortOptions): Promise<T>

  /**
   * Encode the passed object as a protobuf message and write it's length-prefixed bytes to the stream
   */
  write<T>(data: T, proto: { encode: ProtobufEncoder<T> }, options?: AbortOptions): Promise<void>

  /**
   * Encode the passed objects as protobuf messages and write their length-prefixed bytes to the stream as a single write
   */
  writeV<T>(input: T[], proto: { encode: ProtobufEncoder<T> }, options?: AbortOptions): Promise<void>

  /**
   * Returns an object with read/write methods for operating on one specific type of protobuf message
   */
  pb<T>(proto: { encode: ProtobufEncoder<T>, decode: ProtobufDecoder<T> }): ProtobufMessageStream<T, Stream>

  /**
   * Returns the underlying stream
   */
  unwrap(): Stream
}

/**
 * A message reader/writer that only uses one type of message
 */
export interface ProtobufMessageStream <T, S extends MessageStream = MessageStream> {
  /**
   * Read a message from the stream
   */
  read(options?: AbortOptions): Promise<T>

  /**
   * Write a message to the stream
   */
  write(d: T, options?: AbortOptions): Promise<void>

  /**
   * Write several messages to the stream
   */
  writeV(d: T[], options?: AbortOptions): Promise<void>

  /**
   * Unwrap the underlying protobuf stream
   */
  unwrap(): ProtobufStream<S>
}

export interface ProtobufStreamOpts extends LengthPrefixedStreamOpts {

}

export function pbStream <Stream extends MessageStream = MessageStream> (stream: Stream, opts?: Partial<ProtobufStreamOpts>): ProtobufStream<Stream> {
  const lp = lpStream(stream, opts)

  const pbStream: ProtobufStream<Stream> = {
    read: async (proto, options?: AbortOptions) => {
      // readLP, decode
      const value = await lp.read(options)

      return proto.decode(value)
    },
    write: async (message, proto, options?: AbortOptions) => {
      // encode, writeLP
      await lp.write(proto.encode(message), options)
    },
    writeV: async (messages, proto, options?: AbortOptions) => {
      // encode, writeLP
      await lp.writeV(messages.map(message => proto.encode(message)), options)
    },
    pb: (proto) => {
      return {
        read: async (options) => pbStream.read(proto, options),
        write: async (d, options) => pbStream.write(d, proto, options),
        writeV: async (d, options) => pbStream.writeV(d, proto, options),
        unwrap: () => pbStream
      }
    },
    unwrap: () => {
      return lp.unwrap()
    }
  }

  return pbStream
}

export function echo (channel: MessageStream): ReturnType<typeof itPipe> {
  channel.addEventListener('remoteCloseWrite', () => {
    channel.closeWrite()
  })

  return pipe(channel, channel)
}

export type PipeInput = Iterable<Uint8Array | Uint8ArrayList> | AsyncIterable<Uint8Array | Uint8ArrayList> | MessageStream

function isMessageStream (obj?: any): obj is MessageStream {
  return obj?.addEventListener != null
}

export function messageStreamToDuplex (stream: MessageStream): Duplex<AsyncGenerator<Uint8ArrayList | Uint8Array>, Iterable<Uint8ArrayList | Uint8Array> | AsyncIterable<Uint8ArrayList | Uint8Array>> {
  const source = pushable<Uint8ArrayList | Uint8Array>()
  const onError = Promise.withResolvers<IteratorResult<Uint8ArrayList | Uint8Array>>()

  const onMessage = (evt: StreamMessageEvent): void => {
    source.push(evt.data)
  }

  const onRemoteCloseWrite = (): void => {
    source.end()

    stream.removeEventListener('message', onMessage)
    stream.removeEventListener('close', onClose)
    stream.removeEventListener('remoteCloseWrite', onRemoteCloseWrite)
  }

  const onClose = (evt: StreamCloseEvent): void => {
    source.end(evt.error)

    if (evt.error != null) {
      onError.reject(evt.error)
    }

    stream.removeEventListener('message', onMessage)
    stream.removeEventListener('close', onClose)
    stream.removeEventListener('remoteCloseWrite', onRemoteCloseWrite)
  }

  stream.addEventListener('message', onMessage)
  stream.addEventListener('close', onClose, {
    once: true
  })
  stream.addEventListener('remoteCloseWrite', onRemoteCloseWrite, {
    once: true
  })

  return {
    source,
    async sink (source: Source<Uint8Array | Uint8ArrayList>) {
      async function * toGenerator (): AsyncGenerator<Uint8Array | Uint8ArrayList> {
        yield * source
      }

      const gen = toGenerator()

      while (true) {
        const { done, value } = await Promise.race([
          gen.next(),
          onError.promise
        ])

        if (value != null) {
          if (!stream.send(value)) {
            await Promise.race([
              pEvent(stream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            ])
          }
        }

        if (done === true) {
          break
        }
      }

      await stream.closeWrite()
    }
  }
}

interface SourceFn<A = any> { (): A }

type PipeSource<A = any> =
  Iterable<A> |
  AsyncIterable<A> |
  SourceFn<A> |
  Duplex<A, any, any> |
  MessageStream

type PipeTransform<A = any, B = any> =
  Transform<A, B> |
  Duplex<B, A> |
  MessageStream

type PipeSink<A = any, B = any> =
  Sink<A, B> |
  Duplex<any, A, B> |
  MessageStream

type PipeOutput<A> =
  A extends Sink<any> ? ReturnType<A> :
    A extends Duplex<any, any, any> ? ReturnType<A['sink']> :
      A extends MessageStream ? AsyncGenerator<Uint8Array | Uint8ArrayList> :
        never

// single item pipe output includes pipe source types
type SingleItemPipeOutput<A> =
  A extends Iterable<any> ? A :
    A extends AsyncIterable<any> ? A :
      A extends SourceFn ? ReturnType<A> :
        A extends Duplex<any, any, any> ? A['source'] :
          PipeOutput<A>

type PipeFnInput<A> =
  A extends Iterable<any> ? A :
    A extends AsyncIterable<any> ? A :
      A extends SourceFn ? ReturnType<A> :
        A extends Transform<any, any> ? ReturnType<A> :
          A extends Duplex<any, any, any> ? A['source'] :
            never

export function pipe<
  A extends PipeSource
> (
  source: A
): SingleItemPipeOutput<A>
// two items, source to sink
export function pipe<
  A extends PipeSource,
  B extends PipeSink<PipeFnInput<A>>
> (
  source: A,
  sink: B
): PipeOutput<B>

// three items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeSink<PipeFnInput<B>>
> (
  source: A,
  transform1: B,
  sink: C
): PipeOutput<C>

// many items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeSink<PipeFnInput<C>>
> (
  source: A,
  transform1: B,
  transform2: C,
  sink: D
): PipeOutput<D>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeSink<PipeFnInput<D>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  sink: E
): PipeOutput<E>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeSink<PipeFnInput<E>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  sink: F
): PipeOutput<F>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeSink<PipeFnInput<F>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  sink: G
): PipeOutput<G>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeTransform<PipeFnInput<F>>,
  H extends PipeSink<PipeFnInput<G>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  transform6: G,
  sink: H
): PipeOutput<H>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeTransform<PipeFnInput<F>>,
  H extends PipeTransform<PipeFnInput<G>>,
  I extends PipeSink<PipeFnInput<H>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  transform6: G,
  transform7: H,
  sink: I
): PipeOutput<I>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeTransform<PipeFnInput<F>>,
  H extends PipeTransform<PipeFnInput<G>>,
  I extends PipeTransform<PipeFnInput<H>>,
  J extends PipeSink<PipeFnInput<I>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  transform6: G,
  transform7: H,
  transform8: I,
  sink: J
): PipeOutput<J>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeTransform<PipeFnInput<F>>,
  H extends PipeTransform<PipeFnInput<G>>,
  I extends PipeTransform<PipeFnInput<H>>,
  J extends PipeTransform<PipeFnInput<I>>,
  K extends PipeSink<PipeFnInput<J>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  transform6: G,
  transform7: H,
  transform8: I,
  transform9: J,
  sink: K
): PipeOutput<K>

// lots of items, source to sink with transform(s) in between
export function pipe<
  A extends PipeSource,
  B extends PipeTransform<PipeFnInput<A>>,
  C extends PipeTransform<PipeFnInput<B>>,
  D extends PipeTransform<PipeFnInput<C>>,
  E extends PipeTransform<PipeFnInput<D>>,
  F extends PipeTransform<PipeFnInput<E>>,
  G extends PipeTransform<PipeFnInput<F>>,
  H extends PipeTransform<PipeFnInput<G>>,
  I extends PipeTransform<PipeFnInput<H>>,
  J extends PipeTransform<PipeFnInput<I>>,
  K extends PipeTransform<PipeFnInput<J>>,
  L extends PipeSink<PipeFnInput<K>>
> (
  source: A,
  transform1: B,
  transform2: C,
  transform3: D,
  transform4: E,
  transform5: F,
  transform6: G,
  transform7: H,
  transform8: I,
  transform9: J,
  transform10: K,
  sink: L
): PipeOutput<L>
export function pipe (...input: any[]): any {
  const sources = input.map(source => {
    if (isMessageStream(source)) {
      return messageStreamToDuplex(source)
    }

    return source
  })

  // @ts-expect-error it-pipe types say args cannot be spread like this
  return itPipe(...sources)
}
