import { CodeError } from '@libp2p/interfaces/errors'
import { type Logger, logger } from '@libp2p/logger'
import { abortableSource } from 'abortable-iterator'
import { anySignal } from 'any-signal'
import map from 'it-map'
import * as ndjson from 'it-ndjson'
import { pipe } from 'it-pipe'
import { type Pushable, pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Stream } from '@libp2p/interface-connection'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import type { Source } from 'it-stream-types'

let muxers = 0
let streams = 0
const MAX_MESSAGE_SIZE = 1024 * 1024

interface DataMessage {
  id: string
  type: 'data'
  direction: 'initiator' | 'recipient'
  chunk: string
}

interface ResetMessage {
  id: string
  type: 'reset'
  direction: 'initiator' | 'recipient'
}

interface CloseMessage {
  id: string
  type: 'close'
  direction: 'initiator' | 'recipient'
}

interface CreateMessage {
  id: string
  type: 'create'
  direction: 'initiator'
}

type StreamMessage = DataMessage | ResetMessage | CloseMessage | CreateMessage

class MuxedStream {
  public id: string
  public input: Pushable<Uint8ArrayList>
  public stream: Stream
  public type: 'initiator' | 'recipient'

  private sinkEnded: boolean
  private sourceEnded: boolean
  private readonly abortController: AbortController
  private readonly resetController: AbortController
  private readonly closeController: AbortController
  private readonly log: Logger

  constructor (init: { id: string, type: 'initiator' | 'recipient', push: Pushable<StreamMessage>, onEnd: (err?: Error) => void }) {
    const { id, type, push, onEnd } = init

    this.log = logger(`libp2p:mock-muxer:stream:${id}:${type}`)

    this.id = id
    this.type = type
    this.abortController = new AbortController()
    this.resetController = new AbortController()
    this.closeController = new AbortController()

    this.sourceEnded = false
    this.sinkEnded = false

    let endErr: Error | undefined

    const onSourceEnd = (err?: Error): void => {
      if (this.sourceEnded) {
        return
      }

      this.log('onSourceEnd sink ended? %s', this.sinkEnded)

      this.sourceEnded = true

      if (err != null && endErr == null) {
        endErr = err
      }

      if (this.sinkEnded) {
        this.stream.stat.timeline.close = Date.now()

        if (onEnd != null) {
          onEnd(endErr)
        }
      }
    }

    const onSinkEnd = (err?: Error): void => {
      if (this.sinkEnded) {
        return
      }

      this.log('onSinkEnd source ended? %s', this.sourceEnded)

      this.sinkEnded = true

      if (err != null && endErr == null) {
        endErr = err
      }

      if (this.sourceEnded) {
        this.stream.stat.timeline.close = Date.now()

        if (onEnd != null) {
          onEnd(endErr)
        }
      }
    }

    this.input = pushable({
      onEnd: onSourceEnd
    })

    this.stream = {
      id,
      sink: async (source) => {
        if (this.sinkEnded) {
          throw new CodeError('stream closed for writing', 'ERR_SINK_ENDED')
        }

        const signal = anySignal([
          this.abortController.signal,
          this.resetController.signal,
          this.closeController.signal
        ])

        source = abortableSource(source, signal)

        try {
          if (this.type === 'initiator') {
            // If initiator, open a new stream
            const createMsg: CreateMessage = {
              id: this.id,
              type: 'create',
              direction: this.type
            }
            push.push(createMsg)
          }

          const list = new Uint8ArrayList()

          for await (const chunk of source) {
            list.append(chunk)

            while (list.length > 0) {
              const available = Math.min(list.length, MAX_MESSAGE_SIZE)
              const dataMsg: DataMessage = {
                id,
                type: 'data',
                chunk: uint8ArrayToString(list.subarray(0, available), 'base64pad'),
                direction: this.type
              }

              push.push(dataMsg)
              list.consume(available)
            }
          }
        } catch (err: any) {
          if (err.type === 'aborted' && err.message === 'The operation was aborted') {
            if (this.closeController.signal.aborted) {
              return
            }

            if (this.resetController.signal.aborted) {
              err.message = 'stream reset'
              err.code = 'ERR_STREAM_RESET'
            }

            if (this.abortController.signal.aborted) {
              err.message = 'stream aborted'
              err.code = 'ERR_STREAM_ABORT'
            }
          }

          // Send no more data if this stream was remotely reset
          if (err.code !== 'ERR_STREAM_RESET') {
            const resetMsg: ResetMessage = {
              id,
              type: 'reset',
              direction: this.type
            }
            push.push(resetMsg)
          }

          this.log('sink erred', err)

          this.input.end(err)
          onSinkEnd(err)
          return
        } finally {
          signal.clear()
        }

        this.log('sink ended')

        onSinkEnd()

        const closeMsg: CloseMessage = {
          id,
          type: 'close',
          direction: this.type
        }
        push.push(closeMsg)
      },
      source: this.input,

      // Close for reading
      close: () => {
        this.stream.closeRead()
        this.stream.closeWrite()
      },

      closeRead: () => {
        this.input.end()
      },

      closeWrite: () => {
        this.closeController.abort()

        const closeMsg: CloseMessage = {
          id,
          type: 'close',
          direction: this.type
        }
        push.push(closeMsg)
        onSinkEnd()
      },

      // Close for reading and writing (local error)
      abort: (err: Error) => {
        // End the source with the passed error
        this.input.end(err)
        this.abortController.abort()
        onSinkEnd(err)
      },

      // Close immediately for reading and writing (remote error)
      reset: () => {
        const err = new CodeError('stream reset', 'ERR_STREAM_RESET')
        this.resetController.abort()
        this.input.end(err)
        onSinkEnd(err)
      },
      stat: {
        direction: type === 'initiator' ? 'outbound' : 'inbound',
        timeline: {
          open: Date.now()
        }
      },
      metadata: {}
    }
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
      onEnd: (err) => {
        this.close(err)
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

    const registry = message.direction === 'initiator' ? this.registryRecipientStreams : this.registryInitiatorStreams

    if (message.type === 'create') {
      if (registry.has(message.id)) {
        throw new Error(`Already had stream for ${message.id}`)
      }

      muxedStream = this.createStream(message.id, 'recipient')
      registry.set(muxedStream.stream.id, muxedStream)

      if (this.options.onIncomingStream != null) {
        this.options.onIncomingStream(muxedStream.stream)
      }
    }

    muxedStream = registry.get(message.id)

    if (muxedStream == null) {
      this.log.error(`No stream found for ${message.id}`)

      return
    }

    if (message.type === 'data') {
      muxedStream.input.push(new Uint8ArrayList(uint8ArrayFromString(message.chunk, 'base64pad')))
    } else if (message.type === 'reset') {
      this.log('-> reset stream %s %s', muxedStream.type, muxedStream.stream.id)
      muxedStream.stream.reset()
    } else if (message.type === 'close') {
      this.log('-> closing stream %s %s', muxedStream.type, muxedStream.stream.id)
      muxedStream.stream.closeRead()
    }
  }

  get streams (): Stream[] {
    return Array.from(this.registryRecipientStreams.values())
      .concat(Array.from(this.registryInitiatorStreams.values()))
      .map(({ stream }) => stream)
  }

  newStream (name?: string): Stream {
    if (this.closeController.signal.aborted) {
      throw new Error('Muxer already closed')
    }
    this.log('newStream %s', name)
    const storedStream = this.createStream(name, 'initiator')
    this.registryInitiatorStreams.set(storedStream.stream.id, storedStream)

    return storedStream.stream
  }

  createStream (name?: string, type: 'initiator' | 'recipient' = 'initiator'): MuxedStream {
    const id = name ?? `${this.name}:stream:${streams++}`

    this.log('createStream %s %s', type, id)

    const muxedStream: MuxedStream = new MuxedStream({
      id,
      type,
      push: this.streamInput,
      onEnd: () => {
        this.log('stream ended %s %s', type, id)

        if (type === 'initiator') {
          this.registryInitiatorStreams.delete(id)
        } else {
          this.registryRecipientStreams.delete(id)
        }

        if (this.options.onStreamEnd != null) {
          this.options.onStreamEnd(muxedStream.stream)
        }
      }
    })

    return muxedStream
  }

  close (err?: Error): void {
    if (this.closeController.signal.aborted) return
    this.log('closing muxed streams')

    if (err == null) {
      this.streams.forEach(s => {
        s.close()
      })
    } else {
      this.streams.forEach(s => {
        s.abort(err)
      })
    }
    this.closeController.abort()
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
