import { TooManyOutboundProtocolStreamsError, MuxerClosedError } from '@libp2p/interface'
import { closeSource } from '@libp2p/utils/close-source'
import { RateLimiter } from '@libp2p/utils/rate-limiter'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { Decoder } from './decode.js'
import { encode } from './encode.js'
import { StreamInputBufferError } from './errors.js'
import { MessageTypes, MessageTypeNames } from './message-types.js'
import { createStream } from './stream.js'
import type { MplexInit } from './index.js'
import type { Message } from './message-types.js'
import type { MplexStream } from './stream.js'
import type { AbortOptions, ComponentLogger, Logger, Stream, StreamMuxer, StreamMuxerInit } from '@libp2p/interface'
import type { Pushable } from 'it-pushable'
import type { Sink, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const MAX_STREAMS_INBOUND_STREAMS_PER_CONNECTION = 1024
const MAX_STREAMS_OUTBOUND_STREAMS_PER_CONNECTION = 1024
const MAX_STREAM_BUFFER_SIZE = 1024 * 1024 * 4 // 4MB
const DISCONNECT_THRESHOLD = 5
const CLOSE_TIMEOUT = 500

function printMessage (msg: Message): any {
  const output: any = {
    ...msg,
    type: `${MessageTypeNames[msg.type]} (${msg.type})`
  }

  if (msg.type === MessageTypes.NEW_STREAM) {
    output.data = uint8ArrayToString(msg.data instanceof Uint8Array ? msg.data : msg.data.subarray())
  }

  if (msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    output.data = uint8ArrayToString(msg.data instanceof Uint8Array ? msg.data : msg.data.subarray(), 'base16')
  }

  return output
}

export interface MplexComponents {
  logger: ComponentLogger
}

interface MplexStreamMuxerInit extends MplexInit, StreamMuxerInit {
  /**
   * The default timeout to use in ms when shutting down the muxer.
   */
  closeTimeout?: number
}

export class MplexStreamMuxer implements StreamMuxer {
  public protocol = '/mplex/6.7.0'

  public sink: Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>>
  public source: AsyncGenerator<Uint8ArrayList | Uint8Array>

  private readonly log: Logger
  private _streamId: number
  private readonly _streams: { initiators: Map<number, MplexStream>, receivers: Map<number, MplexStream> }
  private readonly _init: MplexStreamMuxerInit
  private readonly _source: Pushable<Message>
  private readonly closeController: AbortController
  private readonly rateLimiter: RateLimiter
  private readonly closeTimeout: number
  private readonly logger: ComponentLogger

  constructor (components: MplexComponents, init?: MplexStreamMuxerInit) {
    init = init ?? {}

    this.log = components.logger.forComponent('libp2p:mplex')
    this.logger = components.logger
    this._streamId = 0
    this._streams = {
      /**
       * Stream to ids map
       */
      initiators: new Map<number, MplexStream>(),
      /**
       * Stream to ids map
       */
      receivers: new Map<number, MplexStream>()
    }
    this._init = init
    this.closeTimeout = init.closeTimeout ?? CLOSE_TIMEOUT

    /**
     * An iterable sink
     */
    this.sink = this._createSink()

    /**
     * An iterable source
     */
    this._source = pushable<Message>({
      objectMode: true,
      onEnd: (): void => {
        // the source has ended, we can't write any more messages to gracefully
        // close streams so all we can do is destroy them
        for (const stream of this._streams.initiators.values()) {
          stream.destroy()
        }

        for (const stream of this._streams.receivers.values()) {
          stream.destroy()
        }
      }
    })
    this.source = pipe(
      this._source,
      source => encode(source)
    )

    /**
     * Close controller
     */
    this.closeController = new AbortController()

    this.rateLimiter = new RateLimiter({
      points: init.disconnectThreshold ?? DISCONNECT_THRESHOLD,
      duration: 1
    })
  }

  /**
   * Returns a Map of streams and their ids
   */
  get streams (): Stream[] {
    // Inbound and Outbound streams may have the same ids, so we need to make those unique
    const streams: Stream[] = []
    for (const stream of this._streams.initiators.values()) {
      streams.push(stream)
    }

    for (const stream of this._streams.receivers.values()) {
      streams.push(stream)
    }
    return streams
  }

  /**
   * Initiate a new stream with the given name. If no name is
   * provided, the id of the stream will be used.
   */
  newStream (name?: string): Stream {
    if (this.closeController.signal.aborted) {
      throw new MuxerClosedError('Muxer already closed')
    }
    const id = this._streamId++
    name = name == null ? id.toString() : name.toString()
    const registry = this._streams.initiators
    return this._newStream({ id, name, type: 'initiator', registry })
  }

  /**
   * Close or abort all tracked streams and stop the muxer
   */
  async close (options?: AbortOptions): Promise<void> {
    if (this.closeController.signal.aborted) {
      return
    }

    const signal = options?.signal ?? AbortSignal.timeout(this.closeTimeout)

    try {
      // try to gracefully close all streams
      await Promise.all(
        this.streams.map(async s => s.close({
          signal
        }))
      )

      this._source.end()

      // try to gracefully close the muxer
      await this._source.onEmpty({
        signal
      })

      this.closeController.abort()
    } catch (err: any) {
      this.abort(err)
    }
  }

  abort (err: Error): void {
    if (this.closeController.signal.aborted) {
      return
    }

    this.streams.forEach(s => { s.abort(err) })
    this.closeController.abort(err)
  }

  /**
   * Called whenever an inbound stream is created
   */
  _newReceiverStream (options: { id: number, name: string }): MplexStream {
    const { id, name } = options
    const registry = this._streams.receivers
    return this._newStream({ id, name, type: 'receiver', registry })
  }

  _newStream (options: { id: number, name: string, type: 'initiator' | 'receiver', registry: Map<number, MplexStream> }): MplexStream {
    const { id, name, type, registry } = options

    this.log('new %s stream %s', type, id)

    if (type === 'initiator' && this._streams.initiators.size === (this._init.maxOutboundStreams ?? MAX_STREAMS_OUTBOUND_STREAMS_PER_CONNECTION)) {
      throw new TooManyOutboundProtocolStreamsError('Too many outbound streams open')
    }

    if (registry.has(id)) {
      throw new Error(`${type} stream ${id} already exists!`)
    }

    const send = async (msg: Message): Promise<void> => {
      if (this.log.enabled) {
        this.log.trace('%s stream %s send', type, id, printMessage(msg))
      }

      this._source.push(msg)
    }

    const onEnd = (): void => {
      this.log('%s stream with id %s and protocol %s ended', type, id, stream.protocol)
      registry.delete(id)

      if (this._init.onStreamEnd != null) {
        this._init.onStreamEnd(stream)
      }
    }

    const stream = createStream({ id, name, send, type, onEnd, maxMsgSize: this._init.maxMsgSize, logger: this.logger })
    registry.set(id, stream)
    return stream
  }

  /**
   * Creates a sink with an abortable source. Incoming messages will
   * also have their size restricted. All messages will be varint decoded.
   */
  _createSink (): Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>> {
    const sink: Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>> = async source => {
      const abortListener = (): void => {
        closeSource(source, this.log)
      }

      this.closeController.signal.addEventListener('abort', abortListener)

      try {
        const decoder = new Decoder(this._init.maxMsgSize, this._init.maxUnprocessedMessageQueueSize)

        for await (const chunk of source) {
          for (const msg of decoder.write(chunk)) {
            await this._handleIncoming(msg)
          }
        }

        this._source.end()
      } catch (err: any) {
        this.log('error in sink', err)
        this._source.end(err) // End the source with an error
      } finally {
        this.closeController.signal.removeEventListener('abort', abortListener)
      }
    }

    return sink
  }

  async _handleIncoming (message: Message): Promise<void> {
    const { id, type } = message

    if (this.log.enabled) {
      this.log.trace('incoming message', printMessage(message))
    }

    // Create a new stream?
    if (message.type === MessageTypes.NEW_STREAM) {
      if (this._streams.receivers.size === (this._init.maxInboundStreams ?? MAX_STREAMS_INBOUND_STREAMS_PER_CONNECTION)) {
        this.log('too many inbound streams open')

        // not going to allow this stream, send the reset message manually
        // instead of setting it up just to tear it down
        this._source.push({
          id,
          type: MessageTypes.RESET_RECEIVER
        })

        // if we've hit our stream limit, and the remote keeps trying to open
        // more new streams, if they are doing this very quickly maybe they
        // are attacking us and we should close the connection
        try {
          await this.rateLimiter.consume('new-stream', 1)
        } catch {
          this.log('rate limit hit when opening too many new streams over the inbound stream limit - closing remote connection')
          // since there's no backpressure in mplex, the only thing we can really do to protect ourselves is close the connection
          this.abort(new Error('Too many open streams'))
          return
        }

        return
      }

      const stream = this._newReceiverStream({ id, name: uint8ArrayToString(message.data instanceof Uint8Array ? message.data : message.data.subarray()) })

      if (this._init.onIncomingStream != null) {
        this._init.onIncomingStream(stream)
      }

      return
    }

    const list = (type & 1) === 1 ? this._streams.initiators : this._streams.receivers
    const stream = list.get(id)

    if (stream == null) {
      this.log('missing stream %s for message type %s', id, MessageTypeNames[type])

      // if the remote keeps sending us messages for streams that have been
      // closed or were never opened they may be attacking us so if they do
      // this very quickly all we can do is close the connection
      try {
        await this.rateLimiter.consume('missing-stream', 1)
      } catch {
        this.log('rate limit hit when receiving messages for streams that do not exist - closing remote connection')
        // since there's no backpressure in mplex, the only thing we can really do to protect ourselves is close the connection
        this.abort(new Error('Too many messages for missing streams'))
        return
      }

      return
    }

    const maxBufferSize = this._init.maxStreamBufferSize ?? MAX_STREAM_BUFFER_SIZE

    try {
      switch (type) {
        case MessageTypes.MESSAGE_INITIATOR:
        case MessageTypes.MESSAGE_RECEIVER:
          if (stream.sourceReadableLength() > maxBufferSize) {
            // Stream buffer has got too large, reset the stream
            this._source.push({
              id: message.id,
              type: type === MessageTypes.MESSAGE_INITIATOR ? MessageTypes.RESET_RECEIVER : MessageTypes.RESET_INITIATOR
            })

            // Inform the stream consumer they are not fast enough
            throw new StreamInputBufferError('Input buffer full - increase Mplex maxBufferSize to accommodate slow consumers')
          }

          // We got data from the remote, push it into our local stream
          stream.sourcePush(message.data)
          break
        case MessageTypes.CLOSE_INITIATOR:
        case MessageTypes.CLOSE_RECEIVER:
          // The remote has stopped writing, so we can stop reading
          stream.remoteCloseWrite()
          break
        case MessageTypes.RESET_INITIATOR:
        case MessageTypes.RESET_RECEIVER:
          // The remote has errored, stop reading and writing to the stream immediately
          stream.reset()
          break
        default:
          this.log('unknown message type %s', type)
      }
    } catch (err: any) {
      this.log.error('error while processing message', err)
      stream.abort(err)
    }
  }
}
