import { pipe } from 'it-pipe'
import { pushableV } from 'it-pushable'
import { abortableSource } from 'abortable-iterator'
import { encode } from './encode.js'
import { decode } from './decode.js'
import { restrictSize } from './restrict-size.js'
import { MessageTypes, MessageTypeNames, Message } from './message-types.js'
import { createStream } from './stream.js'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { Components } from '@libp2p/components'
import type { Sink } from 'it-stream-types'
import type { StreamMuxer, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import type { Stream } from '@libp2p/interface-connection'
import type { MplexInit } from './index.js'
import anySignal from 'any-signal'
import type { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p:mplex')

const MAX_STREAMS_INBOUND_STREAMS_PER_CONNECTION = 1024
const MAX_STREAMS_OUTBOUND_STREAMS_PER_CONNECTION = 1024
const MAX_STREAM_BUFFER_SIZE = 1024 * 1024 * 4 // 4MB
const DISCONNECT_THRESHOLD = 5

function printMessage (msg: Message) {
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

export interface MplexStream extends Stream {
  sourceReadableLength: () => number
  sourcePush: (data: Uint8ArrayList) => void
}

interface MplexStreamMuxerInit extends MplexInit, StreamMuxerInit {}

export class MplexStreamMuxer implements StreamMuxer {
  public protocol = '/mplex/6.7.0'

  public sink: Sink<Uint8Array>
  public source: AsyncIterable<Uint8Array>

  private _streamId: number
  private readonly _streams: { initiators: Map<number, MplexStream>, receivers: Map<number, MplexStream> }
  private readonly _init: MplexStreamMuxerInit
  private readonly _source: { push: (val: Message) => void, end: (err?: Error) => void }
  private readonly closeController: AbortController
  private readonly rateLimiter: RateLimiterMemory

  constructor (components: Components, init?: MplexStreamMuxerInit) {
    init = init ?? {}

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

    /**
     * An iterable sink
     */
    this.sink = this._createSink()

    /**
     * An iterable source
     */
    const source = this._createSource()
    this._source = source
    this.source = source

    /**
     * Close controller
     */
    this.closeController = new AbortController()

    this.rateLimiter = new RateLimiterMemory({
      points: init.disconnectThreshold ?? DISCONNECT_THRESHOLD,
      duration: 1
    })
  }

  init (components: Components) {}

  /**
   * Returns a Map of streams and their ids
   */
  get streams () {
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
      throw new Error('Muxer already closed')
    }
    const id = this._streamId++
    name = name == null ? id.toString() : name.toString()
    const registry = this._streams.initiators
    return this._newStream({ id, name, type: 'initiator', registry })
  }

  /**
   * Close or abort all tracked streams and stop the muxer
   */
  close (err?: Error | undefined): void {
    if (this.closeController.signal.aborted) return

    if (err != null) {
      this.streams.forEach(s => s.abort(err))
    } else {
      this.streams.forEach(s => s.close())
    }
    this.closeController.abort()
  }

  /**
   * Called whenever an inbound stream is created
   */
  _newReceiverStream (options: { id: number, name: string }) {
    const { id, name } = options
    const registry = this._streams.receivers
    return this._newStream({ id, name, type: 'receiver', registry })
  }

  _newStream (options: { id: number, name: string, type: 'initiator' | 'receiver', registry: Map<number, MplexStream> }) {
    const { id, name, type, registry } = options

    log('new %s stream %s %s', type, id)

    if (type === 'initiator' && this._streams.initiators.size === (this._init.maxOutboundStreams ?? MAX_STREAMS_OUTBOUND_STREAMS_PER_CONNECTION)) {
      throw errCode(new Error('Too many outbound streams open'), 'ERR_TOO_MANY_OUTBOUND_STREAMS')
    }

    if (registry.has(id)) {
      throw new Error(`${type} stream ${id} already exists!`)
    }

    const send = (msg: Message) => {
      if (log.enabled) {
        log.trace('%s stream %s send', type, id, printMessage(msg))
      }

      this._source.push(msg)
    }

    const onEnd = () => {
      log('%s stream with id %s and protocol %s ended', type, id, stream.stat.protocol)
      registry.delete(id)

      if (this._init.onStreamEnd != null) {
        this._init.onStreamEnd(stream)
      }
    }

    const stream = createStream({ id, name, send, type, onEnd, maxMsgSize: this._init.maxMsgSize })
    registry.set(id, stream)
    return stream
  }

  /**
   * Creates a sink with an abortable source. Incoming messages will
   * also have their size restricted. All messages will be varint decoded.
   */
  _createSink () {
    const sink: Sink<Uint8Array> = async source => {
      // see: https://github.com/jacobheun/any-signal/pull/18
      const abortSignals = [this.closeController.signal]
      if (this._init.signal != null) {
        abortSignals.push(this._init.signal)
      }
      source = abortableSource(source, anySignal(abortSignals))

      try {
        await pipe(
          source,
          decode,
          restrictSize(this._init.maxMsgSize),
          async source => {
            for await (const msg of source) {
              await this._handleIncoming(msg)
            }
          }
        )

        this._source.end()
      } catch (err: any) {
        log('error in sink', err)
        this._source.end(err) // End the source with an error
      }
    }

    return sink
  }

  /**
   * Creates a source that restricts outgoing message sizes
   * and varint encodes them
   */
  _createSource () {
    const onEnd = (err?: Error) => {
      this.close(err)
    }
    const source = pushableV<Message>({
      objectMode: true,
      onEnd
    })

    return Object.assign(encode(source), {
      push: source.push,
      end: source.end,
      return: source.return
    })
  }

  async _handleIncoming (message: Message) {
    const { id, type } = message

    if (log.enabled) {
      log.trace('incoming message', printMessage(message))
    }

    // Create a new stream?
    if (message.type === MessageTypes.NEW_STREAM) {
      if (this._streams.receivers.size === (this._init.maxInboundStreams ?? MAX_STREAMS_INBOUND_STREAMS_PER_CONNECTION)) {
        log('too many inbound streams open')

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
          log('rate limit hit when opening too many new streams over the inbound stream limit - closing remote connection')
          // since there's no backpressure in mplex, the only thing we can really do to protect ourselves is close the connection
          this._source.end(new Error('Too many open streams'))
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
      log('missing stream %s for message type %s', id, MessageTypeNames[type])

      return
    }

    const maxBufferSize = this._init.maxStreamBufferSize ?? MAX_STREAM_BUFFER_SIZE

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
          const error = errCode(new Error('Input buffer full - increase Mplex maxBufferSize to accommodate slow consumers'), 'ERR_STREAM_INPUT_BUFFER_FULL')
          stream.abort(error)

          return
        }

        // We got data from the remote, push it into our local stream
        stream.sourcePush(message.data)
        break
      case MessageTypes.CLOSE_INITIATOR:
      case MessageTypes.CLOSE_RECEIVER:
        // We should expect no more data from the remote, stop reading
        stream.closeRead()
        break
      case MessageTypes.RESET_INITIATOR:
      case MessageTypes.RESET_RECEIVER:
        // Stop reading and writing to the stream immediately
        stream.reset()
        break
      default:
        log('unknown message type %s', type)
    }
  }
}
