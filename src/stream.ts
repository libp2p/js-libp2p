import { Stream, StreamStat, Direction } from '@libp2p/interface-connection'
import { Source, Sink } from 'it-stream-types'
import { pushable } from 'it-pushable'
import * as lengthPrefixed from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import defer, { DeferredPromise } from 'p-defer'
import merge from 'it-merge'
import { Uint8ArrayList } from 'uint8arraylist'
import { logger } from '@libp2p/logger'
import * as pb from '../proto_ts/message.js'

const log = logger('libp2p:webrtc:stream')

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
  channel: RTCDataChannel
  metadata?: Record<string, any>
  stat: StreamStat
  closeCb?: (stream: WebRTCStream) => void
}

export class WebRTCStream implements Stream {
  /**
   * Unique identifier for a stream
   */
  id: string;

  /**
   * Stats about this stream
   */
  stat: StreamStat;

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>;

  private readonly channel: RTCDataChannel;
  streamState = new StreamState();

  // _src is exposed to the user via the `source` getter to read unwrapped protobuf
  // data from the underlying datachannel.
  private readonly _src: Source<Uint8ArrayList>;

  // _innersrc is used to push data from the underlying datachannel to the
  // length prefix decoder and then the protobuf decoder.
  private readonly _innersrc = pushable();

  // sink is used to write data to the remote. It takes care of wrapping
  // data in a protobuf and adding the length prefix.
  sink: Sink<Uint8ArrayList | Uint8Array, Promise<void>>;

  // promises
  // opened is resolved when the underlying datachannel is in the open state.
  opened: DeferredPromise<void> = defer();
  // closeWritePromise is used to trigger a generator which can be used to close
  // the sink.
  closeWritePromise: DeferredPromise<void> = defer();
  closeCb?: (stream: WebRTCStream) => void | undefined

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
        if (!this.stat.timeline.close) {
          this.stat.timeline.close = new Date().getTime()
        }
        this.opened.resolve()
        break
    }

    this.metadata = opts.metadata ?? {}

    // closable sink
    this.sink = this._sinkFn

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
      if (data.length == 0 || !data) {
        return
      }
      this._innersrc.push(new Uint8Array(data as ArrayBufferLike))
    }

    // pipe framed protobuf messages through
    // a length prefixed decoder, and surface
    // data from the `Message.message` field
    // through a source.
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

  // If user attempts to set a new source
  // this should be a nop
  set source (_src: Source<Uint8ArrayList>) {
  }

  get source (): Source<Uint8ArrayList> {
    return this._src
  }

  private async _sinkFn (src: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    await this.opened.promise
    if (this.streamState.state == StreamStates.CLOSED || this.streamState.state == StreamStates.WRITE_CLOSED) {
      return
    }

    const self = this
    const closeWriteIterable = {
      async * [Symbol.asyncIterator] () {
        await self.closeWritePromise.promise
        yield new Uint8Array(0)
      }
    }

    for await (const buf of merge(closeWriteIterable, src)) {
      const state = self.streamState.state
      if (state == StreamStates.CLOSED || state == StreamStates.WRITE_CLOSED) {
        return
      }
      const msgbuf = pb.Message.toBinary({ message: buf.subarray() })
      const sendbuf = lengthPrefixed.encode.single(msgbuf)
      this.channel.send(sendbuf.subarray())
    }
  }

  processIncomingProtobuf (buffer: Uint8Array): Uint8Array | undefined {
    const m = pb.Message.fromBinary(buffer)
    if (m.flag) {
      const [currentState, nextState] = this.streamState.transition({ direction: 'inbound', flag: m.flag })
      if (currentState != nextState) {
        switch (nextState) {
          case StreamStates.READ_CLOSED:
            this._innersrc.end()
            break
          case StreamStates.WRITE_CLOSED:
            this.closeWritePromise.resolve()
            break
          case StreamStates.CLOSED:
            this.close()
        }
      }
    }
    return m.message
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
    if (this.closeCb != null) {
      this.closeCb(this)
    }
  }

  /**
   * Close a stream for reading only
   */
  closeRead (): void {
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.STOP_SENDING })
    if (currentState == StreamStates.OPEN || currentState == StreamStates.WRITE_CLOSED) {
      this._sendFlag(pb.Message_Flag.STOP_SENDING);
      (this._innersrc).end()
    }
    if (currentState != nextState && nextState == StreamStates.CLOSED) {
      this.close()
    }
  }

  /**
   * Close a stream for writing only
   */
  closeWrite (): void {
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.FIN })
    if (currentState == StreamStates.OPEN || currentState == StreamStates.READ_CLOSED) {
      this._sendFlag(pb.Message_Flag.FIN)
      this.closeWritePromise.resolve()
    }
    if (currentState != nextState && nextState == StreamStates.CLOSED) {
      this.close()
    }
  }

  /**
   * Call when a local error occurs, should close the stream for reading and writing
   */
  abort (err: Error): void {
    this.close()
  }

  /**
   * Close the stream for writing, and indicate to the remote side this is being done 'abruptly'
   *
   * @see closeWrite
   */
  reset (): void {
    this.stat = defaultStat(this.stat.direction)
    const [currentState, nextState] = this.streamState.transition({ direction: 'outbound', flag: pb.Message_Flag.RESET })
    if (currentState != nextState) {
      this._sendFlag(pb.Message_Flag.RESET)
      this.close()
    }
  }

  private _sendFlag (flag: pb.Message_Flag): void {
    try {
      log.trace('Sending flag: %s', flag.toString())
      const msgbuf = pb.Message.toBinary({ flag: flag })
      this.channel.send(lengthPrefixed.encode.single(msgbuf).subarray())
    } catch (e) {
      log.error(`Exception while sending flag ${flag}: ${e}`)
    }
  }
}

/*
 * State transitions for a stream
 */
interface StreamStateInput {
  direction: 'inbound' | 'outbound'
  flag: pb.Message_Flag
}

export enum StreamStates {
  OPEN,
  READ_CLOSED,
  WRITE_CLOSED,
  CLOSED,
}

class StreamState {
  state: StreamStates = StreamStates.OPEN

  transition ({ direction, flag }: StreamStateInput): [StreamStates, StreamStates] {
    const prev = this.state
    if (this.state == StreamStates.CLOSED) {
      return [prev, StreamStates.CLOSED]
    }
    if (direction == 'inbound') {
      switch (flag) {
        case pb.Message_Flag.FIN:
          if (this.state == StreamStates.OPEN) {
            this.state = StreamStates.READ_CLOSED
          } else if (this.state == StreamStates.WRITE_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.STOP_SENDING:
          if (this.state == StreamStates.OPEN) {
            this.state = StreamStates.WRITE_CLOSED
          } else if (this.state == StreamStates.READ_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.RESET:
          this.state = StreamStates.CLOSED
      }
    } else {
      switch (flag) {
        case pb.Message_Flag.FIN:
          if (this.state == StreamStates.OPEN) {
            this.state = StreamStates.WRITE_CLOSED
          } else if (this.state == StreamStates.READ_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.STOP_SENDING:
          if (this.state == StreamStates.OPEN) {
            this.state = StreamStates.READ_CLOSED
          } else if (this.state == StreamStates.WRITE_CLOSED) {
            this.state = StreamStates.CLOSED
          }
          break

        case pb.Message_Flag.RESET:
          this.state = StreamStates.CLOSED
      }
    }
    return [prev, this.state]
  }
}
