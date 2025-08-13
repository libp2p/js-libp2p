import * as lp from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { AbstractStreamMuxer } from './abstract-stream-muxer.ts'
import { AbstractStream } from './abstract-stream.ts'
import { Queue } from './queue/index.js'
import type { SendResult } from './abstract-message-stream.ts'
import type { AbstractStreamInit } from './abstract-stream.ts'
import type { AbortOptions, MessageStreamDirection, CreateStreamOptions, StreamMuxerFactory, StreamMuxer, MultiaddrConnection } from '@libp2p/interface'
import type { Pushable } from 'it-pushable'
import type { SupportedEncodings } from 'uint8arrays/from-string'

let streams = 0

interface DataMessage {
  id: string
  type: 'data'
  chunk: string
}

interface ResetMessage {
  id: string
  type: 'reset'
}

interface CloseWriteMessage {
  id: string
  type: 'closeWrite'
}

interface CloseReadMessage {
  id: string
  type: 'closeRead'
}

interface CreateMessage {
  id: string
  type: 'create'
  protocol?: string
}

interface PauseMessage {
  id: string
  type: 'pause'
}

interface ResumeMessage {
  id: string
  type: 'resume'
}

type StreamMessage = DataMessage | ResetMessage | CloseWriteMessage | CloseReadMessage | CreateMessage | PauseMessage | ResumeMessage

export interface MockMuxedStreamInit extends AbstractStreamInit {
  sendMessage(message: StreamMessage): boolean
  encoding: SupportedEncodings
}

class MockMuxedStream extends AbstractStream {
  private readonly sendMessage: (message: StreamMessage) => boolean
  private dataQueue: Queue
  private encoding: SupportedEncodings

  constructor (init: MockMuxedStreamInit) {
    super(init)

    this.sendMessage = init.sendMessage
    this.encoding = init.encoding
    this.dataQueue = new Queue({
      concurrency: 1
    })

    if (this.direction === 'outbound') {
      this.sendMessage({
        id: this.id,
        type: 'create',
        protocol: this.protocol
      })
    }
  }

  sendData (data: Uint8ArrayList): SendResult {
    const canSendMore = this.sendMessage({
      id: this.id,
      type: 'data',
      chunk: uint8ArrayToString(data.subarray(), this.encoding)
    })

    return {
      sentBytes: data.byteLength,
      canSendMore
    }
  }

  sendReset (): void {
    this.sendMessage({
      id: this.id,
      type: 'reset'
    })
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.sendMessage({
      id: this.id,
      type: 'closeWrite'
    })

    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    this.sendMessage({
      id: this.id,
      type: 'closeRead'
    })

    options?.signal?.throwIfAborted()
  }

  sendPause (): void {
    this.sendMessage({
      id: this.id,
      type: 'pause'
    })
  }

  sendResume (): void {
    this.sendMessage({
      id: this.id,
      type: 'resume'
    })
  }

  onRemotePaused (): void {
    // console.info('remote pasued')
    this.dataQueue.pause()
  }

  onRemoteResumed (): void {
    // console.info('remote resumved')
    this.dataQueue.resume()
  }
}

interface MockMuxerInit {
  /**
   * How long the input queue can grow
   */
  maxInputQueueSize?: number

  /**
   * How to encode data message
   *
   * @default base64
   */
  encoding?: SupportedEncodings
}

class MockMuxer extends AbstractStreamMuxer<MockMuxedStream> {
  private input: Pushable<Uint8Array | Uint8ArrayList>
  private maxInputQueueSize: number
  private encoding: SupportedEncodings

  constructor (maConn: MultiaddrConnection, init: MockMuxerInit) {
    super(maConn, {
      ...init,
      protocol: '/mock-muxer/1.0.0',
      name: 'mock-muxer'
    })

    this.maxInputQueueSize = init.maxInputQueueSize ?? 1024 * 1024 * 10
    this.encoding = init.encoding ?? 'base64'
    this.input = pushable()
    this.sendMessage = this.sendMessage.bind(this)

    Promise.resolve()
      .then(async () => {
        for await (const buf of lp.decode(this.input)) {
          this.onMessage(JSON.parse(uint8ArrayToString(buf.subarray())))
        }
      })
      .catch(err => {
        this.abort(err)
      })
  }

  onData (data: Uint8Array | Uint8ArrayList): void {
    if (this.input.readableLength >= this.maxInputQueueSize) {
      this.abort(new Error(`Input queue exceeded maximum size ${this.input.readableLength} >= ${this.maxInputQueueSize}`))
      return
    }

    this.input.push(data)
  }

  sendMessage (message: StreamMessage): boolean {
    this.log('send message %o', message)

    const json = JSON.stringify(message)
    const buf = uint8ArrayFromString(json)
    const encoded = lp.encode.single(buf)

    return this.send(encoded)
  }

  onMessage (message: StreamMessage): void {
    this.log('incoming message %o', message)
    let stream: MockMuxedStream | undefined = this.streams.find(s => s.id === message.id)

    if (message.type === 'create') {
      if (stream != null) {
        throw new Error(`Already had stream for ${message.id}`)
      }

      this.log('create stream inbound %s', message.id)
      stream = this._createStream(message.id, 'inbound', {
        protocol: message.protocol
      })

      this.onRemoteStream(stream)
    }

    if (stream == null) {
      this.log.error(`No stream found for ${message.id}`)
      return
    }

    if (message.type === 'data') {
      stream.onData(uint8ArrayFromString(message.chunk, this.encoding))
    } else if (message.type === 'reset') {
      stream.onRemoteReset()
    } else if (message.type === 'closeWrite') {
      stream.onRemoteCloseWrite()
    } else if (message.type === 'closeRead') {
      stream.onRemoteCloseRead()
    } else if (message.type === 'pause') {
      stream.onRemotePaused()
    } else if (message.type === 'resume') {
      stream.onRemoteResumed()
    }
  }

  onCreateStream (options: CreateStreamOptions): MockMuxedStream {
    return this._createStream(`${streams++}`, 'outbound', options)
  }

  _createStream (id: string, direction: MessageStreamDirection, options: CreateStreamOptions): MockMuxedStream {
    this.log('createStream %s %s', direction, id)

    return new MockMuxedStream({
      ...options,
      id,
      direction,
      log: this.log.newScope(`stream:${direction}:${id}`),
      sendMessage: this.sendMessage,
      encoding: this.encoding
    })
  }
}

class MockMuxerFactory implements StreamMuxerFactory {
  public protocol: string = '/mock-muxer/1.0.0'
  private init: MockMuxerInit

  constructor (init: MockMuxerInit) {
    this.init = init
  }

  createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
    return new MockMuxer(maConn, {
      ...this.init
    })
  }
}

export function mockMuxer (init: MockMuxerInit = {}): StreamMuxerFactory {
  return new MockMuxerFactory(init)
}
