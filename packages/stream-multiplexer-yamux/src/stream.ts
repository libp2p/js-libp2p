import { CodeError } from '@libp2p/interface/errors'
import { abortableSource } from 'abortable-iterator'
import { pushable, type Pushable } from 'it-pushable'
import { ERR_RECV_WINDOW_EXCEEDED, ERR_STREAM_ABORT, ERR_STREAM_RESET, INITIAL_STREAM_WINDOW } from './constants.js'
import { Flag, type FrameHeader, FrameType, HEADER_LENGTH } from './frame.js'
import type { Config } from './config.js'
import type { Direction, Stream, StreamTimeline } from '@libp2p/interface/connection'
import type { Logger } from '@libp2p/logger'
import type { Sink, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export enum StreamState {
  Init,
  SYNSent,
  SYNReceived,
  Established,
  Finished,
}

export enum HalfStreamState {
  Open,
  Closed,
  Reset,
}

export interface YamuxStreamInit {
  id: number
  name?: string
  sendFrame: (header: FrameHeader, body?: Uint8Array) => void
  onStreamEnd: () => void
  getRTT: () => number
  config: Config
  state: StreamState
  log?: Logger
  direction: 'inbound' | 'outbound'
}

/** YamuxStream is used to represent a logical stream within a session */
export class YamuxStream implements Stream {
  id: string
  name?: string
  direction: Direction
  timeline: StreamTimeline
  metadata: Record<string, any>

  state: StreamState
  /** Used to track received FIN/RST */
  readState: HalfStreamState
  /** Used to track sent FIN/RST */
  writeState: HalfStreamState

  /** Input to the read side of the stream */
  sourceInput: Pushable<Uint8ArrayList>
  /** Read side of the stream */
  source: AsyncGenerator<Uint8ArrayList>
  /** Write side of the stream */
  sink: Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>>

  private readonly config: Config
  private readonly log?: Logger
  private readonly _id: number

  /** The number of available bytes to send */
  private sendWindowCapacity: number
  /** Callback to notify that the sendWindowCapacity has been updated */
  private sendWindowCapacityUpdate?: () => void

  /** The number of bytes available to receive in a full window */
  private recvWindow: number
  /** The number of available bytes to receive */
  private recvWindowCapacity: number

  /**
   * An 'epoch' is the time it takes to process and read data
   *
   * Used in conjunction with RTT to determine whether to increase the recvWindow
   */
  private epochStart: number
  private readonly getRTT: () => number

  /** Used to stop the sink */
  private readonly abortController: AbortController

  private readonly sendFrame: (header: FrameHeader, body?: Uint8Array) => void
  private readonly onStreamEnd: () => void

  constructor (init: YamuxStreamInit) {
    this.config = init.config
    this.log = init.log
    this._id = init.id
    this.id = String(init.id)
    this.name = init.name
    this.direction = init.direction
    this.timeline = {
      open: Date.now()
    }
    this.metadata = {}

    this.state = init.state
    this.readState = HalfStreamState.Open
    this.writeState = HalfStreamState.Open

    this.sendWindowCapacity = INITIAL_STREAM_WINDOW
    this.recvWindow = this.config.initialStreamWindowSize
    this.recvWindowCapacity = this.recvWindow
    this.epochStart = Date.now()
    this.getRTT = init.getRTT

    this.abortController = new AbortController()

    this.sendFrame = init.sendFrame
    this.onStreamEnd = init.onStreamEnd

    this.sourceInput = pushable({
      onEnd: (err?: Error) => {
        if (err != null) {
          this.log?.error('stream source ended id=%s', this._id, err)
        } else {
          this.log?.trace('stream source ended id=%s', this._id)
        }

        this.closeRead()
      }
    })

    this.source = this.createSource()

    this.sink = async (source: Source<Uint8Array | Uint8ArrayList>): Promise<void> => {
      if (this.writeState !== HalfStreamState.Open) {
        throw new Error('stream closed for writing')
      }

      source = abortableSource(source, this.abortController.signal, { returnOnAbort: true })

      try {
        for await (let data of source) {
          // send in chunks, waiting for window updates
          while (data.length !== 0) {
            // wait for the send window to refill
            if (this.sendWindowCapacity === 0) await this.waitForSendWindowCapacity()

            // send as much as we can
            const toSend = Math.min(this.sendWindowCapacity, this.config.maxMessageSize - HEADER_LENGTH, data.length)
            this.sendData(data.subarray(0, toSend))
            this.sendWindowCapacity -= toSend
            data = data.subarray(toSend)
          }
        }
      } catch (e) {
        this.log?.error('stream sink error id=%s', this._id, e)
      } finally {
        this.log?.trace('stream sink ended id=%s', this._id)
        this.closeWrite()
      }
    }
  }

  private async * createSource (): AsyncGenerator<Uint8ArrayList> {
    try {
      for await (const val of this.sourceInput) {
        this.sendWindowUpdate()
        yield val
      }
    } catch (err) {
      const errCode = (err as { code: string }).code
      if (errCode !== ERR_STREAM_ABORT) {
        this.log?.error('stream source error id=%s', this._id, err)
        throw err
      }
    }
  }

  close (): void {
    this.log?.trace('stream close id=%s', this._id)
    this.closeRead()
    this.closeWrite()
  }

  closeRead (): void {
    if (this.state === StreamState.Finished) {
      return
    }

    if (this.readState !== HalfStreamState.Open) {
      return
    }

    this.log?.trace('stream close read id=%s', this._id)

    this.readState = HalfStreamState.Closed

    // close the source
    this.sourceInput.end()

    // If the both read and write are closed, finish it
    if (this.writeState !== HalfStreamState.Open) {
      this.finish()
    }
  }

  closeWrite (): void {
    if (this.state === StreamState.Finished) {
      return
    }

    if (this.writeState !== HalfStreamState.Open) {
      return
    }

    this.log?.trace('stream close write id=%s', this._id)

    this.writeState = HalfStreamState.Closed

    this.sendClose()

    // close the sink
    this.abortController.abort()

    // If the both read and write are closed, finish it
    if (this.readState !== HalfStreamState.Open) {
      this.finish()
    }
  }

  abort (err?: Error): void {
    switch (this.state) {
      case StreamState.Finished:
        return
      case StreamState.Init:
        // we haven't sent anything, so we don't need to send a reset.
        break
      case StreamState.SYNSent:
      case StreamState.SYNReceived:
      case StreamState.Established:
        // at least one direction is open, we need to send a reset.
        this.sendReset()
        break
      default:
        throw new Error('unreachable')
    }

    if (err != null) {
      this.log?.error('stream abort id=%s error=%s', this._id, err)
    } else {
      this.log?.trace('stream abort id=%s', this._id)
    }

    this.onReset(new CodeError(String(err) ?? 'stream aborted', ERR_STREAM_ABORT))
  }

  reset (): void {
    if (this.state === StreamState.Finished) {
      return
    }

    this.log?.trace('stream reset id=%s', this._id)

    this.onReset(new CodeError('stream reset', ERR_STREAM_RESET))
  }

  /**
   * Called when initiating and receiving a stream reset
   */
  private onReset (err: Error): void {
    // Update stream state to reset / finished
    if (this.writeState === HalfStreamState.Open) {
      this.writeState = HalfStreamState.Reset
    }
    if (this.readState === HalfStreamState.Open) {
      this.readState = HalfStreamState.Reset
    }
    this.state = StreamState.Finished

    // close both the source and sink
    this.sourceInput.end(err)
    this.abortController.abort()

    // and finish the stream
    this.finish()
  }

  /**
   * Wait for the send window to be non-zero
   *
   * Will throw with ERR_STREAM_ABORT if the stream gets aborted
   */
  async waitForSendWindowCapacity (): Promise<void> {
    if (this.abortController.signal.aborted) {
      throw new CodeError('stream aborted', ERR_STREAM_ABORT)
    }
    if (this.sendWindowCapacity > 0) {
      return
    }
    let reject: (err: Error) => void
    const abort = (): void => {
      reject(new CodeError('stream aborted', ERR_STREAM_ABORT))
    }
    this.abortController.signal.addEventListener('abort', abort)
    await new Promise((_resolve, _reject) => {
      this.sendWindowCapacityUpdate = () => {
        this.abortController.signal.removeEventListener('abort', abort)
        _resolve(undefined)
      }
      reject = _reject
    })
  }

  /**
   * handleWindowUpdate is called when the stream receives a window update frame
   */
  handleWindowUpdate (header: FrameHeader): void {
    this.log?.trace('stream received window update id=%s', this._id)
    this.processFlags(header.flag)

    // increase send window
    const available = this.sendWindowCapacity
    this.sendWindowCapacity += header.length
    // if the update increments a 0 availability, notify the stream that sending can resume
    if (available === 0 && header.length > 0) {
      this.sendWindowCapacityUpdate?.()
    }
  }

  /**
   * handleData is called when the stream receives a data frame
   */
  async handleData (header: FrameHeader, readData: () => Promise<Uint8ArrayList>): Promise<void> {
    this.log?.trace('stream received data id=%s', this._id)
    this.processFlags(header.flag)

    // check that our recv window is not exceeded
    if (this.recvWindowCapacity < header.length) {
      throw new CodeError('receive window exceeded', ERR_RECV_WINDOW_EXCEEDED, { available: this.recvWindowCapacity, recv: header.length })
    }

    const data = await readData()
    this.recvWindowCapacity -= header.length
    this.sourceInput.push(data)
  }

  /**
   * processFlags is used to update the state of the stream based on set flags, if any.
   */
  private processFlags (flags: number): void {
    if ((flags & Flag.ACK) === Flag.ACK) {
      if (this.state === StreamState.SYNSent) {
        this.state = StreamState.Established
      }
    }
    if ((flags & Flag.FIN) === Flag.FIN) {
      this.closeRead()
    }
    if ((flags & Flag.RST) === Flag.RST) {
      this.reset()
    }
  }

  /**
   * finish sets the state and triggers eventual garbage collection of the stream
   */
  private finish (): void {
    this.log?.trace('stream finished id=%s', this._id)
    this.state = StreamState.Finished
    this.timeline.close = Date.now()
    this.onStreamEnd()
  }

  /**
   * getSendFlags determines any flags that are appropriate
   * based on the current stream state.
   *
   * The state is updated as a side-effect.
   */
  private getSendFlags (): number {
    switch (this.state) {
      case StreamState.Init:
        this.state = StreamState.SYNSent
        return Flag.SYN
      case StreamState.SYNReceived:
        this.state = StreamState.Established
        return Flag.ACK
      default:
        return 0
    }
  }

  /**
   * potentially sends a window update enabling further writes to take place.
   */
  sendWindowUpdate (): void {
    // determine the flags if any
    const flags = this.getSendFlags()

    // If the stream has already been established
    // and we've processed data within the time it takes for 4 round trips
    // then we (up to) double the recvWindow
    const now = Date.now()
    const rtt = this.getRTT()
    if (flags === 0 && rtt > 0 && now - this.epochStart < rtt * 4) {
      // we've already validated that maxStreamWindowSize can't be more than MAX_UINT32
      this.recvWindow = Math.min(this.recvWindow * 2, this.config.maxStreamWindowSize)
    }

    if (this.recvWindowCapacity >= this.recvWindow && flags === 0) {
      // a window update isn't needed
      return
    }

    // update the receive window
    const delta = this.recvWindow - this.recvWindowCapacity
    this.recvWindowCapacity = this.recvWindow

    // update the epoch start
    this.epochStart = now

    // send window update
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: flags,
      streamID: this._id,
      length: delta
    })
  }

  private sendData (data: Uint8Array): void {
    const flags = this.getSendFlags()
    this.sendFrame({
      type: FrameType.Data,
      flag: flags,
      streamID: this._id,
      length: data.length
    }, data)
  }

  private sendClose (): void {
    const flags = this.getSendFlags() | Flag.FIN
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: flags,
      streamID: this._id,
      length: 0
    })
  }

  private sendReset (): void {
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: Flag.RST,
      streamID: this._id,
      length: 0
    })
  }
}
