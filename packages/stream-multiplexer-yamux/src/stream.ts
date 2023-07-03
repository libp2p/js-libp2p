import { CodeError } from '@libp2p/interface/errors'
import { AbstractStream, type AbstractStreamInit } from '@libp2p/interface/stream-muxer/stream'
import each from 'it-foreach'
import { ERR_RECV_WINDOW_EXCEEDED, ERR_STREAM_ABORT, INITIAL_STREAM_WINDOW } from './constants.js'
import { Flag, type FrameHeader, FrameType, HEADER_LENGTH } from './frame.js'
import type { Config } from './config.js'
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

export interface YamuxStreamInit extends AbstractStreamInit {
  name?: string
  sendFrame: (header: FrameHeader, body?: Uint8Array) => void
  getRTT: () => number
  config: Config
  state: StreamState
}

/** YamuxStream is used to represent a logical stream within a session */
export class YamuxStream extends AbstractStream {
  name?: string

  state: StreamState
  /** Used to track received FIN/RST */
  readState: HalfStreamState
  /** Used to track sent FIN/RST */
  writeState: HalfStreamState

  private readonly config: Config
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

  constructor (init: YamuxStreamInit) {
    super({
      ...init,
      onEnd: (err?: Error) => {
        this.state = StreamState.Finished
        init.onEnd?.(err)
      },
      onCloseRead: () => {
        this.readState = HalfStreamState.Closed
      },
      onCloseWrite: () => {
        this.writeState = HalfStreamState.Closed
      },
      onReset: () => {
        this.readState = HalfStreamState.Reset
        this.writeState = HalfStreamState.Reset
        this.abortController.abort()
      },
      onAbort: () => {
        this.readState = HalfStreamState.Reset
        this.writeState = HalfStreamState.Reset
        this.abortController.abort()
      }
    })

    this.config = init.config
    this._id = parseInt(init.id, 10)
    this.name = init.name

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

    this.source = each(this.source, () => {
      this.sendWindowUpdate()
    })
  }

  /**
   * Send a message to the remote muxer informing them a new stream is being
   * opened
   */
  async sendNewStream (): Promise<void> {

  }

  /**
   * Send a data message to the remote muxer
   */
  async sendData (buf: Uint8ArrayList): Promise<void> {
    buf = buf.sublist()

    // send in chunks, waiting for window updates
    while (buf.byteLength !== 0) {
      // wait for the send window to refill
      if (this.sendWindowCapacity === 0) {
        await this.waitForSendWindowCapacity()
      }

      // check we didn't close while waiting for send window capacity
      if (this.status !== 'open') {
        return
      }

      // send as much as we can
      const toSend = Math.min(this.sendWindowCapacity, this.config.maxMessageSize - HEADER_LENGTH, buf.length)
      const flags = this.getSendFlags()

      this.sendFrame({
        type: FrameType.Data,
        flag: flags,
        streamID: this._id,
        length: toSend
      }, buf.subarray(0, toSend))

      this.sendWindowCapacity -= toSend

      buf.consume(toSend)
    }
  }

  /**
   * Send a reset message to the remote muxer
   */
  async sendReset (): Promise<void> {
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: Flag.RST,
      streamID: this._id,
      length: 0
    })
  }

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be sent by this end of the stream
   */
  async sendCloseWrite (): Promise<void> {
    const flags = this.getSendFlags() | Flag.FIN
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: flags,
      streamID: this._id,
      length: 0
    })
  }

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be read by this end of the stream
   */
  async sendCloseRead (): Promise<void> {

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
    let resolve: () => void
    let reject: (err: Error) => void
    const abort = (): void => {
      if (this.status === 'open') {
        reject(new CodeError('stream aborted', ERR_STREAM_ABORT))
      } else {
        // the stream was closed already, ignore the failure to send
        resolve()
      }
    }
    this.abortController.signal.addEventListener('abort', abort)
    await new Promise<void>((_resolve, _reject) => {
      this.sendWindowCapacityUpdate = () => {
        this.abortController.signal.removeEventListener('abort', abort)
        _resolve()
      }
      reject = _reject
      resolve = _resolve
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

    this.sourcePush(data)
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
      this.remoteCloseWrite()
    }
    if ((flags & Flag.RST) === Flag.RST) {
      this.reset()
    }
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
}
