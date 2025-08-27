import { MuxerClosedError } from '@libp2p/interface'
import { RateLimiter, AbstractStreamMuxer } from '@libp2p/utils'
import { toString as uint8ArrayToString } from 'uint8arrays'
import { Decoder, MAX_MSG_QUEUE_SIZE, MAX_MSG_SIZE } from './decode.js'
import { MessageTypes, MessageTypeNames } from './message-types.js'
import { createStream } from './stream.js'
import type { MplexInit } from './index.js'
import type { Message } from './message-types.js'
import type { MplexStream } from './stream.js'
import type { CreateStreamOptions, MultiaddrConnection, MessageStreamDirection } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

const DISCONNECT_THRESHOLD = 5

function printMessage (msg: Message): any {
  const output: any = {
    ...msg,
    type: `${MessageTypeNames[msg.type]} (${msg.type})`
  }

  if (msg.type === MessageTypes.NEW_STREAM) {
    output.data = uint8ArrayToString(msg.data.subarray())
  }

  if (msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    output.data = uint8ArrayToString(msg.data.subarray(), 'base16')
  }

  return output
}

export class MplexStreamMuxer extends AbstractStreamMuxer<MplexStream> {
  private _streamId: number
  private readonly rateLimiter: RateLimiter
  private readonly maxMessageSize: number
  private readonly maxUnprocessedMessageQueueSize: number
  private readonly decoder: Decoder

  constructor (maConn: MultiaddrConnection, init: MplexInit) {
    super(maConn, {
      ...init,
      protocol: '/mplex/6.7.0',
      name: 'mplex'
    })

    this._streamId = 0
    this.maxMessageSize = init.maxMessageSize ?? MAX_MSG_SIZE
    this.maxUnprocessedMessageQueueSize = init.maxUnprocessedMessageQueueSize ?? MAX_MSG_QUEUE_SIZE
    this.decoder = new Decoder(this.maxMessageSize, this.maxUnprocessedMessageQueueSize)

    this.rateLimiter = new RateLimiter({
      points: init.disconnectThreshold ?? DISCONNECT_THRESHOLD,
      duration: 1
    })
  }

  onData (data: Uint8Array | Uint8ArrayList): void {
    for (const msg of this.decoder.write(data)) {
      this.handleMessage(msg)
    }
  }

  /**
   * Initiate a new stream with the given name. If no name is
   * provided, the id of the stream will be used.
   */
  onCreateStream (options: CreateStreamOptions): MplexStream {
    if (this.status !== 'open') {
      throw new MuxerClosedError('Muxer already closed')
    }

    const id = this._streamId++

    return this._newStream(id, 'outbound', options)
  }

  _newStream (id: number, direction: MessageStreamDirection, options?: CreateStreamOptions): MplexStream {
    this.log('new %s stream %s', direction, id)

    const stream = createStream({
      ...options,
      id,
      direction,
      maxMsgSize: this.maxMessageSize,
      log: this.log,
      muxer: this
    })

    return stream
  }

  handleMessage (message: Message): void {
    if (this.log.enabled) {
      this.log.trace('incoming message', printMessage(message))
    }

    // Create a new stream?
    if (message.type === MessageTypes.NEW_STREAM) {
      // close the connection if the remote opens too many streams too quickly
      try {
        this.rateLimiter.consume('new-stream', 1)
      } catch {
        this.log('rate limit hit when opening too many new streams over the inbound stream limit - closing remote connection')
        // since there's no backpressure in mplex, the only thing we can really do to protect ourselves is close the connection
        this.abort(new Error('Too many open streams'))
        return
      }

      const stream = this._newStream(message.id, 'inbound', this.streamOptions)
      this.onRemoteStream(stream)

      return
    }

    const id = `${(message.type & 1) === 1 ? 'i' : 'r'}${message.id}`
    const stream = this.streams.find(s => s.id === id)

    if (stream == null) {
      this.log('missing stream %s for message type %s', id, MessageTypeNames[message.type])

      // if the remote keeps sending us messages for streams that have been
      // closed or were never opened they may be attacking us so if they do
      // this very quickly all we can do is close the connection
      try {
        this.rateLimiter.consume('missing-stream', 1)
      } catch {
        this.log('rate limit hit when receiving messages for streams that do not exist - closing remote connection')
        // since there's no backpressure in mplex, the only thing we can really do to protect ourselves is close the connection
        this.abort(new Error('Too many messages for missing streams'))
        return
      }

      return
    }

    try {
      switch (message.type) {
        case MessageTypes.MESSAGE_INITIATOR:
        case MessageTypes.MESSAGE_RECEIVER:
          // We got data from the remote, push it into our local stream
          stream.onData(message.data)
          break
        case MessageTypes.CLOSE_INITIATOR:
        case MessageTypes.CLOSE_RECEIVER:
          // The remote has stopped writing
          stream.onRemoteCloseWrite()
          break
        case MessageTypes.RESET_INITIATOR:
        case MessageTypes.RESET_RECEIVER:
          // The remote has errored, stop reading and writing to the stream immediately
          stream.onRemoteReset()
          break
        default:
          this.log('unknown message type')
      }
    } catch (err: any) {
      this.log.error('error while processing message - %e', err)
      stream.abort(err)
    }
  }
}
