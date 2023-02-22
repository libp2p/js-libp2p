import type { Stream, StreamStat, Direction } from '@libp2p/interface-connection'
import { logger } from '@libp2p/logger'
import * as lengthPrefixed from 'it-length-prefixed'
import merge from 'it-merge'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import defer, { DeferredPromise } from 'p-defer'
import type { Source } from 'it-stream-types'
import { Uint8ArrayList } from 'uint8arraylist'

import * as pb from '../proto_ts/message.js'

const log = logger('libp2p:webrtc:stream')

/**
 * Constructs a default StreamStat
 */
export function defaultStat (dir: Direction): StreamStat {
  return {
    direction: dir,
    timeline: {
      open: 0,
      close: undefined
    }
  }
}

interface StreamInitOpts {
  /**
   * The network channel used for bidirectional peer-to-peer transfers of
   * arbitrary data
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
   */
  channel: RTCDataChannel

  /**
   * User defined stream metadata
   */
  metadata?: Record<string, any>

  /**
   * Stats about this stream
   */
  stat: StreamStat

  /**
   * Callback to invoke when the stream is closed.
   */
  closeCb?: (stream: WebRTCStream) => void
}

/*
 * State transitions for a stream
 */
interface StreamStateInput {
  /**
   * Outbound conections are opened by the local node, inbound streams are
   * opened by the remote
   */
  direction: 'inbound' | 'outbound'

  /**
   * Message flag from the protobufs
   *
   * 0 = FIN
   * 1 = STOP_SENDING
   * 2 = RESET
   */
  flag: pb.Message_Flag
}

export enum StreamStates {
  OPEN,
  READ_CLOSED,
  WRITE_CLOSED,
  CLOSED,
}

// Checked by the Typescript compiler. If this fails it's because the switch
// statement is not exhaustive.
function unreachableBranch (x: never): never {
  throw new Error('Case not handled in switch')
}

class StreamState {
  state: StreamStates = StreamStates.OPEN

  isWriteClosed (): boolean {
    return (this.state === StreamStates.CLOSED || this.state === StreamStates.WRITE_CLOSED)
  }

  transition ({ direction, flag }: StreamStateInput): [StreamStates, StreamStates] {
    const prev = this.state

    // return early if the stream is closed
    if (this.state === StreamStates.CLOSED) {
      return [prev, StreamStates.CLOSED]
    }

    if (direction === 'inbound') {
      switch (flag) {
        case pb.Message_Flag.FIN:
          if (this.state === StreamStates.OPEN) {
            this.state = StreamStates.READ_CLOSED
          } else if (this.state === StreamStates.WRITE_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.STOP_SENDING:
          if (this.state === StreamStates.OPEN) {
            this.state = StreamStates.WRITE_CLOSED
          } else if (this.state === StreamStates.READ_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.RESET:
          this.state = StreamStates.CLOSED
          break
        default:
          unreachableBranch(flag)
      }
    } else {
      switch (flag) {
        case pb.Message_Flag.FIN:
          if (this.state === StreamStates.OPEN) {
            this.state = StreamStates.WRITE_CLOSED
          } else if (this.state === StreamStates.READ_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.STOP_SENDING:
          if (this.state === StreamStates.OPEN) {
            this.state = StreamStates.READ_CLOSED
          } else if (this.state === StreamStates.WRITE_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.RESET:
          this.state = StreamStates.CLOSED
          break

        default:
          unreachableBranch(flag)
      }
    }
    return [prev, this.state]
  }
}

export class WebRTCStream implements Stream {
  /**
   * Unique identifier for a stream
   */
  id: string

  /**
   * Stats about this stream
   */
  stat: StreamStat

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>

  /**
   * The data channel used to send and receive data
   */
  private readonly channel: RTCDataChannel

  /**
   * The current state of the stream
   */
  streamState = new StreamState()

  /**
   * Read unwrapped protobuf data from the underlying datachannel.
   * _src is exposed to the user via the `source` getter to .
   */
  private readonly _src: Source<Uint8ArrayList>

  /**
   * push data from the underlying datachannel to the length prefix decoder
   * and then the protobuf decoder.
   */
  private readonly _innersrc = pushable()

  /**
   * Deferred promise that resolves when the underlying datachannel is in the
   * open state.
   */
  opened: DeferredPromise<void> = defer()

  /**
   * sinkCreated is set to true once the sinkFunction is invoked
   */
  _sinkCalled: boolean = false

  /**
   * Triggers a generator which can be used to close the sink.
   */
  closeWritePromise: DeferredPromise<void> = defer()

  /**
   * Callback to invoke when the stream is closed.
   */
  closeCb?: (stream: WebRTCStream) => void

  constructor (opts: StreamInitOpts) {
    this.channel = opts.channel
    this.id = this.channel.label

    this.stat = opts.stat
    switch (this.channel.readyState) {
      case 'open':
        this.opened.resolve()
        break

      case 'closed':
      case 'closing':
        this.streamState.state = StreamStates.CLOSED
        if (this.stat.timeline.close === undefined || this.stat.timeline.close === 0) {
          this.stat.timeline.close = new Date().getTime()
        }
        this.opened.resolve()
        break
      case 'connecting':
        // noop
        break

      default:
        unreachableBranch(this.channel.readyState)
    }

    this.metadata = opts.metadata ?? {}

    // handle RTCDataChannel events
    this.channel.onopen = (_evt) => {
      this.stat.timeline.open = new Date().getTime()
      this.opened.resolve()
    }

    this.channel.onclose = (_evt) => {
      this.close()
    }

    this.channel.onerror = (evt) => {
      const err = (evt as RTCErrorEvent).error
      this.abort(err)
    }

    const self = this

    // reader pipe
    this.channel.onmessage = async ({ data }) => {
      if (data === null || data.length === 0) {
        return
      }
      this._innersrc.push(new Uint8Array(data as ArrayBufferLike))
    }

    // pipe framed protobuf messages through a length prefixed decoder, and
    // surface data from the `Message.message` field through a source.
    this._src = pipe(
      this._innersrc,
      lengthPrefixed.decode(),
      (source) => (async function * () {
        for await (const buf of source) {
          const message = self.processIncomingProtobuf(buf.subarray())
          if (message != null) {
            yield new Uint8ArrayList(message)
          }
        }
      })()
    )
  }

  // If user attempts to set a new source this should be a noop
  set source (_src: Source<Uint8ArrayList>) { }

  get source (): Source<Uint8ArrayList> {
    return this._src
  }

  /**
   * Write data to the remote peer.
   * It takes care of wrapping data in a protobuf and adding the length prefix.
   */
  async sink (src: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    if (this._sinkCalled) {
      throw new Error('sink already called on this stream')
    }
    // await stream opening before sending data
    await this.opened.promise
    try {
      await this._sink(src)
    } finally {
      this.closeWrite()
    }
  }

  /**
   * Closable sink implementation
   */
  private async _sink (src: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    const closeWrite = this._closeWriteIterable()
    for await (const buf of merge(closeWrite, src)) {
      if (this.streamState.isWriteClosed()) {
        return
      }
      const msgbuf = pb.Message.toBinary({ message: buf.subarray() })
      const sendbuf = lengthPrefixed.encode.single(msgbuf)

      this.channel.send(sendbuf.subarray())
    }
  }

  /**
   * Handle incoming
   */
  processIncomingProtobuf (buffer: Uint8Array): Uint8Array | undefined {
    const message = pb.Message.fromBinary(buffer)

    if (message.flag !== undefined) {
      const [currentState, nextState] = this.streamState.transition({ direction: 'inbound', flag: message.flag })

      if (currentState !== nextState) {
        switch (nextState) {
          case StreamStates.READ_CLOSED:
            this._innersrc.end()
            break
          case StreamStates.WRITE_CLOSED:
            this.closeWritePromise.resolve()
            break
          case StreamStates.CLOSED:
            this.close()
            break
          // StreamStates.OPEN will never be a nextState
          case StreamStates.OPEN:
            break
          default:
            unreachableBranch(nextState)
        }
      }
    }

    return message.message
  }

  /**
   * Close a stream for reading and writing
   */
  close (): void {
    this.stat.timeline.close = new Date().getTime()
    this.streamState.state = StreamStates.CLOSED
    this._innersrc.end()
    this.closeWritePromise.resolve()
    this.channel.close()

    if (this.closeCb !== undefined) {
      this.closeCb(this)
    }
  }

  /**
   * Close a stream for reading only
   */
  closeRead (): void {
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.STOP_SENDING })
    if (currentState === nextState) {
      // No change, no op
      return
    }

    if (currentState === StreamStates.OPEN || currentState === StreamStates.WRITE_CLOSED) {
      this._sendFlag(pb.Message_Flag.STOP_SENDING)
      this._innersrc.end()
    }

    if (nextState === StreamStates.CLOSED) {
      this.close()
    }
  }

  /**
   * Close a stream for writing only
   */
  closeWrite (): void {
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.FIN })
    if (currentState === nextState) {
      // No change, no op
      return
    }

    if (currentState === StreamStates.OPEN || currentState === StreamStates.READ_CLOSED) {
      this._sendFlag(pb.Message_Flag.FIN)
      this.closeWritePromise.resolve()
    }

    if (nextState === StreamStates.CLOSED) {
      this.close()
    }
  }

  /**
   * Call when a local error occurs, should close the stream for reading and writing
   */
  abort (err: Error): void {
    log.error(`An error occurred, closing the stream for reading and writing: ${err.message}`)
    this.close()
  }

  /**
   * Close the stream for writing, and indicate to the remote side this is being done 'abruptly'
   *
   * @see this.closeWrite
   */
  reset (): void {
    // TODO Why are you resetting the stat here?
    this.stat = defaultStat(this.stat.direction)
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.RESET })
    if (currentState === nextState) {
      // No change, no op
      return
    }

    this._sendFlag(pb.Message_Flag.RESET)
    this.close()
  }

  private _sendFlag (flag: pb.Message_Flag): void {
    try {
      log.trace('Sending flag: %s', flag.toString())
      const msgbuf = pb.Message.toBinary({ flag })
      this.channel.send(lengthPrefixed.encode.single(msgbuf).subarray())
    } catch (err) {
      if (err instanceof Error) {
        log.error(`Exception while sending flag ${flag}: ${err.message}`)
      }
    }
  }

  private _closeWriteIterable (): Source<Uint8ArrayList | Uint8Array> {
    const self = this
    return {
      async * [Symbol.asyncIterator] () {
        await self.closeWritePromise.promise
        yield new Uint8Array(0)
      }
    }
  }
}
