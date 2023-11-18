import { type Logger, logger } from '@libp2p/logger'
import { AbstractStream, type AbstractStreamInit } from '@libp2p/utils/abstract-stream'
import { abortableSource } from 'abortable-iterator'
import map from 'it-map'
import * as ndjson from 'it-ndjson'
import { pipe } from 'it-pipe'
import { type Pushable, pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { AbortOptions } from '@libp2p/interface'
import type { Direction, Stream } from '@libp2p/interface/connection'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface/stream-muxer'
import type { Source } from 'it-stream-types'

let muxers = 0
let streams = 0

interface DataMessage {
  id: string
  type: 'data'
  direction: Direction
  chunk: string
}

interface ResetMessage {
  id: string
  type: 'reset'
  direction: Direction
}

interface CloseMessage {
  id: string
  type: 'close'
  direction: Direction
}

interface CreateMessage {
  id: string
  type: 'create'
  direction: 'outbound'
}

type StreamMessage = DataMessage | ResetMessage | CloseMessage | CreateMessage

export interface MockMuxedStreamInit extends AbstractStreamInit {
  push: Pushable<StreamMessage>
}

class MuxedStream extends AbstractStream {
  private readonly push: Pushable<StreamMessage>

  constructor (init: MockMuxedStreamInit) {
    super(init)

    this.push = init.push
  }

  sendNewStream (): void {
    // If initiator, open a new stream
    const createMsg: CreateMessage = {
      id: this.id,
      type: 'create',
      direction: 'outbound'
    }
    this.push.push(createMsg)
  }

  sendData (data: Uint8ArrayList): void {
    const dataMsg: DataMessage = {
      id: this.id,
      type: 'data',
      chunk: uint8ArrayToString(data.subarray(), 'base64pad'),
      direction: this.direction
    }
    this.push.push(dataMsg)
  }

  sendReset (): void {
    const resetMsg: ResetMessage = {
      id: this.id,
      type: 'reset',
      direction: this.direction
    }
    this.push.push(resetMsg)
  }

  sendCloseWrite (): void {
    const closeMsg: CloseMessage = {
      id: this.id,
      type: 'close',
      direction: this.direction
    }
    this.push.push(closeMsg)
  }

  sendCloseRead (): void {
    // does not support close read, only close write
  }
}

class MockMuxer implements StreamMuxer {
  public source: AsyncGenerator<Uint8Array>
  public input: Pushable<Uint8Array>
  public streamInput: Pushable<StreamMessage>
  public name: string
  public protocol: string = '/mock-muxer/1.0.0'

  private readonly closeController: AbortController
  private readonly registryInitiatorStreams: Map<string, MuxedStream>
  private readonly registryRecipientStreams: Map<string, MuxedStream>
  private readonly options: StreamMuxerInit

  private readonly log: Logger

  constructor (init?: StreamMuxerInit) {
    this.name = `muxer:${muxers++}`
    this.log = logger(`libp2p:mock-muxer:${this.name}`)
    this.registryInitiatorStreams = new Map()
    this.registryRecipientStreams = new Map()
    this.log('create muxer')
    this.options = init ?? { direction: 'inbound' }
    this.closeController = new AbortController()
    // receives data from the muxer at the other end of the stream
    this.source = this.input = pushable({
      onEnd: () => {
        for (const stream of this.registryInitiatorStreams.values()) {
          stream.destroy()
        }

        for (const stream of this.registryRecipientStreams.values()) {
          stream.destroy()
        }
      }
    })

    // receives messages from all of the muxed streams
    this.streamInput = pushable<StreamMessage>({
      objectMode: true
    })
  }

  // receive incoming messages
  async sink (source: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    try {
      await pipe(
        abortableSource(source, this.closeController.signal),
        (source) => map(source, buf => uint8ArrayToString(buf.subarray())),
        ndjson.parse<StreamMessage>,
        async (source) => {
          for await (const message of source) {
            this.log.trace('-> %s %s %s', message.type, message.direction, message.id)
            this.handleMessage(message)
          }
        }
      )

      this.log('muxed stream ended')
      this.input.end()
    } catch (err: any) {
      this.log('muxed stream errored', err)
      this.input.end(err)
    }
  }

  handleMessage (message: StreamMessage): void {
    let muxedStream: MuxedStream | undefined

    const registry = message.direction === 'outbound' ? this.registryRecipientStreams : this.registryInitiatorStreams

    if (message.type === 'create') {
      if (registry.has(message.id)) {
        throw new Error(`Already had stream for ${message.id}`)
      }

      muxedStream = this.createStream(message.id, 'inbound')
      registry.set(muxedStream.id, muxedStream)

      if (this.options.onIncomingStream != null) {
        this.options.onIncomingStream(muxedStream)
      }
    }

    muxedStream = registry.get(message.id)

    if (muxedStream == null) {
      this.log.error(`No stream found for ${message.id}`)

      return
    }

    if (message.type === 'data') {
      muxedStream.sourcePush(new Uint8ArrayList(uint8ArrayFromString(message.chunk, 'base64pad')))
    } else if (message.type === 'reset') {
      this.log('-> reset stream %s %s', muxedStream.direction, muxedStream.id)
      muxedStream.reset()
    } else if (message.type === 'close') {
      this.log('-> closing stream %s %s', muxedStream.direction, muxedStream.id)
      muxedStream.remoteCloseWrite()
    }
  }

  get streams (): Stream[] {
    return Array.from(this.registryRecipientStreams.values())
      .concat(Array.from(this.registryInitiatorStreams.values()))
  }

  newStream (name?: string): Stream {
    if (this.closeController.signal.aborted) {
      throw new Error('Muxer already closed')
    }
    this.log('newStream %s', name)
    const storedStream = this.createStream(name, 'outbound')
    this.registryInitiatorStreams.set(storedStream.id, storedStream)

    return storedStream
  }

  createStream (name?: string, direction: Direction = 'outbound'): MuxedStream {
    const id = name ?? `${streams++}`

    this.log('createStream %s %s', direction, id)

    const muxedStream: MuxedStream = new MuxedStream({
      id,
      direction,
      push: this.streamInput,
      onEnd: () => {
        this.log('stream ended')

        if (direction === 'outbound') {
          this.registryInitiatorStreams.delete(muxedStream.id)
        } else {
          this.registryRecipientStreams.delete(muxedStream.id)
        }

        if (this.options.onStreamEnd != null) {
          this.options.onStreamEnd(muxedStream)
        }
      },
      log: logger(`libp2p:mock-muxer:stream:${direction}:${id}`)
    })

    return muxedStream
  }

  async close (options?: AbortOptions): Promise<void> {
    if (this.closeController.signal.aborted) {
      return
    }

    const signal = options?.signal ?? AbortSignal.timeout(10)

    try {
      // try to gracefully close all streams
      await Promise.all(
        this.streams.map(async s => s.close({
          signal
        }))
      )

      this.input.end()

      // try to gracefully close the muxer
      await this.input.onEmpty({
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

    this.log('aborting muxed streams')

    this.streams.forEach(s => {
      s.abort(err)
    })

    this.closeController.abort(err)
    this.input.end(err)
  }
}

class MockMuxerFactory implements StreamMuxerFactory {
  public protocol: string = '/mock-muxer/1.0.0'

  createStreamMuxer (init?: StreamMuxerInit): StreamMuxer {
    const mockMuxer = new MockMuxer(init)

    void Promise.resolve().then(async () => {
      void pipe(
        mockMuxer.streamInput,
        ndjson.stringify,
        (source) => map(source, str => new Uint8ArrayList(uint8ArrayFromString(str))),
        async (source) => {
          for await (const buf of source) {
            mockMuxer.input.push(buf.subarray())
          }
        }
      )
    })

    return mockMuxer
  }
}

export function mockMuxer (): MockMuxerFactory {
  return new MockMuxerFactory()
}
