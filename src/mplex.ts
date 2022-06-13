import { pipe } from 'it-pipe'
import { Pushable, pushableV } from 'it-pushable'
import { abortableSource } from 'abortable-iterator'
import { encode } from './encode.js'
import { decode } from './decode.js'
import { restrictSize } from './restrict-size.js'
import { MessageTypes, MessageTypeNames, Message } from './message-types.js'
import { createStream } from './stream.js'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { trackedMap } from '@libp2p/tracked-map'
import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import type { Components } from '@libp2p/interfaces/components'
import type { Sink } from 'it-stream-types'
import type { StreamMuxer, StreamMuxerInit } from '@libp2p/interfaces/stream-muxer'
import type { Stream } from '@libp2p/interfaces/connection'
import type { MplexInit } from './index.js'

const log = logger('libp2p:mplex')

const MAX_STREAMS_PER_CONNECTION = 1024
const MAX_STREAM_BUFFER_SIZE = 1024 * 1024 * 4 // 4MB

function printMessage (msg: Message) {
  const output: any = {
    ...msg,
    type: `${MessageTypeNames[msg.type]} (${msg.type})`
  }

  if (msg.type === MessageTypes.NEW_STREAM) {
    output.data = uint8ArrayToString(msg.data instanceof Uint8Array ? msg.data : msg.data.slice())
  }

  if (msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    output.data = uint8ArrayToString(msg.data instanceof Uint8Array ? msg.data : msg.data.slice(), 'base16')
  }

  return output
}

export interface MplexStream extends Stream {
  source: Pushable<Uint8Array>
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

  constructor (components: Components, init?: MplexStreamMuxerInit) {
    init = init ?? {}

    this._streamId = 0
    this._streams = {
      /**
       * Stream to ids map
       */
      initiators: trackedMap<number, MplexStream>({ metrics: components.getMetrics(), component: 'mplex', metric: 'initiatorStreams' }),
      /**
       * Stream to ids map
       */
      receivers: trackedMap<number, MplexStream>({ metrics: components.getMetrics(), component: 'mplex', metric: 'receiverStreams' })
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
  }

  init (components: Components) {

  }

  /**
   * Returns a Map of streams and their ids
   */
  get streams () {
    // Inbound and Outbound streams may have the same ids, so we need to make those unique
    const streams: Stream[] = []
    this._streams.initiators.forEach(stream => {
      streams.push(stream)
    })
    this._streams.receivers.forEach(stream => {
      streams.push(stream)
    })
    return streams
  }

  /**
   * Initiate a new stream with the given name. If no name is
   * provided, the id of the stream will be used.
   */
  newStream (name?: string): Stream {
    const id = this._streamId++
    name = name == null ? id.toString() : name.toString()
    const registry = this._streams.initiators
    return this._newStream({ id, name, type: 'initiator', registry })
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
    const maxStreams = this._init.maxStreamsPerConnection ?? MAX_STREAMS_PER_CONNECTION

    if ((this._streams.initiators.size + this._streams.receivers.size) === maxStreams) {
      throw errCode(new Error('Too many streams open'), 'ERR_TOO_MANY_STREAMS')
    }

    const { id, name, type, registry } = options

    log('new %s stream %s %s', type, id, name)

    if (registry.has(id)) {
      throw new Error(`${type} stream ${id} already exists!`)
    }

    const send = (msg: Message) => {
      if (!registry.has(id)) {
        throw errCode(new Error('the stream is not in the muxer registry, it may have already been closed'), 'ERR_STREAM_DOESNT_EXIST')
      }

      if (log.enabled) {
        log.trace('%s stream %s send', type, id, printMessage(msg))
      }

      if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
        msg.data = msg.data instanceof Uint8Array ? msg.data : msg.data.slice()
      }

      this._source.push(msg)
    }

    const onEnd = () => {
      log('%s stream %s %s ended', type, id, name)
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
      if (this._init.signal != null) {
        source = abortableSource(source, this._init.signal)
      }

      try {
        await pipe(
          source,
          decode,
          restrictSize(this._init.maxMsgSize),
          async source => {
            for await (const msg of source) {
              this._handleIncoming(msg)
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
      const { initiators, receivers } = this._streams
      // Abort all the things!
      for (const s of initiators.values()) {
        if (err != null) {
          s.abort(err)
        } else {
          s.close()
        }
      }
      for (const s of receivers.values()) {
        if (err != null) {
          s.abort(err)
        } else {
          s.close()
        }
      }
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

  _handleIncoming (message: Message) {
    const { id, type } = message

    if (log.enabled) {
      log.trace('incoming message', printMessage(message))
    }

    // Create a new stream?
    if (message.type === MessageTypes.NEW_STREAM) {
      const stream = this._newReceiverStream({ id, name: uint8ArrayToString(message.data instanceof Uint8Array ? message.data : message.data.slice()) })

      if (this._init.onIncomingStream != null) {
        this._init.onIncomingStream(stream)
      }

      return
    }

    const list = (type & 1) === 1 ? this._streams.initiators : this._streams.receivers
    const stream = list.get(id)

    if (stream == null) {
      log('missing stream %s', id)

      return
    }

    const maxBufferSize = this._init.maxStreamBufferSize ?? MAX_STREAM_BUFFER_SIZE

    switch (type) {
      case MessageTypes.MESSAGE_INITIATOR:
      case MessageTypes.MESSAGE_RECEIVER:
        if (stream.source.readableLength > maxBufferSize) {
          // Stream buffer has got too large, reset the stream
          this._source.push({
            id: message.id,
            type: type === MessageTypes.MESSAGE_INITIATOR ? MessageTypes.RESET_RECEIVER : MessageTypes.RESET_INITIATOR
          })

          // Inform the stream consumer they are not fast enough
          const error = errCode(new Error('Input buffer full - increase Mplex maxBufferSize to accomodate slow consumers'), 'ERR_STREAM_INPUT_BUFFER_FULL')
          stream.abort(error)

          return
        }

        // We got data from the remote, push it into our local stream
        stream.source.push(message.data.slice())
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
