import { AbstractStream } from '@libp2p/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import { INITIAL_STREAM_WINDOW, MAX_STREAM_WINDOW } from './constants.js'
import { isDataFrame } from './decode.ts'
import { InvalidFrameError, ReceiveWindowExceededError } from './errors.js'
import { Flag, FrameType, HEADER_LENGTH } from './frame.js'
import type { Frame } from './decode.ts'
import type { FrameHeader } from './frame.js'
import type { AbortOptions } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'

export enum StreamState {
  Init,
  SYNSent,
  SYNReceived,
  Established,
  Finished,
  Paused
}

export interface YamuxStreamInit extends AbstractStreamInit {
  streamId: number
  sendFrame(header: FrameHeader, body?: Uint8ArrayList): boolean
  getRTT(): number
  initialStreamWindowSize?: number
  maxMessageSize?: number
  maxStreamWindowSize?: number
  state: StreamState
}

/** YamuxStream is used to represent a logical stream within a session */
export class YamuxStream extends AbstractStream {
  streamId: number
  state: StreamState

  /** The number of available bytes to send */
  private sendWindowCapacity: number
  /** The number of bytes available to receive in a full window */
  private recvWindow: number
  /** The number of available bytes to receive */
  private recvWindowCapacity: number
  private maxStreamWindowSize: number

  /**
   * An 'epoch' is the time it takes to process and read data
   *
   * Used in conjunction with RTT to determine whether to increase the recvWindow
   */
  private epochStart: number
  private readonly getRTT: () => number

  private readonly sendFrame: (header: FrameHeader, body?: Uint8ArrayList) => boolean

  constructor (init: YamuxStreamInit) {
    const initialWindowSize = init.initialStreamWindowSize ?? INITIAL_STREAM_WINDOW

    super({
      ...init,
      maxMessageSize: initialWindowSize - HEADER_LENGTH
    })

    this.streamId = init.streamId
    this.state = init.state
    this.sendWindowCapacity = initialWindowSize
    this.recvWindow = initialWindowSize
    this.recvWindowCapacity = this.recvWindow
    this.maxStreamWindowSize = init.maxStreamWindowSize ?? MAX_STREAM_WINDOW
    this.epochStart = Date.now()
    this.getRTT = init.getRTT
    this.sendFrame = init.sendFrame

    const setStateToFinishedOnCloseListener = (): void => {
      this.state = StreamState.Finished
    }
    this.addEventListener('close', setStateToFinishedOnCloseListener)
  }

  /**
   * Send a data message to the remote muxer
   */
  sendData (buf: Uint8ArrayList): SendResult {
    const totalBytes = buf.byteLength
    let sentBytes = 0
    let canSendMore = true

    this.log?.trace('send window capacity is %d bytes', this.sendWindowCapacity)

    // send in chunks, waiting for window updates
    while (buf.byteLength > 0) {
      // we exhausted the send window, sending will resume later
      if (this.sendWindowCapacity === 0) {
        canSendMore = false
        this.log?.trace('sent %d/%d bytes, exhausted send window, waiting for window update', sentBytes, totalBytes)
        break
      }

      // send as much as we can
      const toSend = Math.min(this.sendWindowCapacity, buf.byteLength)
      const flags = this.getSendFlags()

      const data = buf.sublist(0, toSend)
      buf.consume(toSend)

      const muxerSendMore = this.sendFrame({
        type: FrameType.Data,
        flag: flags,
        streamID: this.streamId,
        length: toSend
      }, data)

      this.sendWindowCapacity -= toSend
      sentBytes += toSend

      if (!muxerSendMore) {
        canSendMore = muxerSendMore
        this.log.trace('sent %d/%d bytes, wait for muxer to have more send capacity', sentBytes, totalBytes)
        break
      }
    }

    return {
      sentBytes,
      canSendMore
    }
  }

  /**
   * Send a reset message to the remote muxer
   */
  sendReset (): void {
    this.sendFrame({
      type: FrameType.WindowUpdate,
      flag: Flag.RST,
      streamID: this.streamId,
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
      streamID: this.streamId,
      length: 0
    })
  }

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be read by this end of the stream - this is a no-op on Yamux streams
   */
  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  /**
   * Stop sending window updates temporarily - in the interim the the remote
   * send window will exhaust and the remote will stop sending data
   */
  sendPause (): void {
    this.state = StreamState.Paused
  }

  /**
   * Start sending window updates as normal
   */
  sendResume (): void {
    this.state = StreamState.Established
    this.sendWindowUpdate()
  }

  /**
   * handleWindowUpdate is called when the stream receives a window update frame
   */
  handleWindowUpdate (frame: Frame): void {
    this.processFlags(frame.header.flag)

    // increase send window
    this.sendWindowCapacity += frame.header.length

    // change the chunk size the superclass uses
    this.maxMessageSize = this.sendWindowCapacity - HEADER_LENGTH

    if (this.maxMessageSize < 0) {
      this.maxMessageSize = 0
    }

    if (this.maxMessageSize === 0) {
      return
    }

    // if writing is paused and the update increases our send window, notify
    // writers that writing can resume
    if (this.writeBuffer.byteLength > 0) {
      this.log?.trace('window update of %d bytes allows more data to be sent, have %d bytes queued, sending data %s', frame.header.length, this.writeBuffer.byteLength, this.sendingData)
      this.safeDispatchEvent('drain')
    }
  }

  /**
   * handleData is called when the stream receives a data frame
   */
  handleData (frame: Frame): void {
    if (!isDataFrame(frame)) {
      throw new InvalidFrameError('Frame was not data frame')
    }

    this.processFlags(frame.header.flag)

    // check that our recv window is not exceeded
    if (this.recvWindowCapacity < frame.header.length) {
      throw new ReceiveWindowExceededError('Receive window exceeded')
    }

    this.recvWindowCapacity -= frame.header.length

    this.onData(frame.data)

    this.sendWindowUpdate()
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
      this.onRemoteCloseWrite()
    }

    if ((flags & Flag.RST) === Flag.RST) {
      this.onRemoteReset()
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
   * Potentially sends a window update enabling further remote writes to take
   * place.
   */
  sendWindowUpdate (): void {
    if (this.state === StreamState.Paused) {
      // we don't want any more data from the remote right now - update the
      // epoch start as otherwise when we unpause we'd be looking at the epoch
      // start from before we were paused
      this.epochStart = Date.now()

      return
    }

    // determine the flags if any
    const flags = this.getSendFlags()

    // If the stream has already been established
    // and we've processed data within the time it takes for 4 round trips
    // then we (up to) double the recvWindow
    const now = Date.now()
    const rtt = this.getRTT()

    if (flags === 0 && rtt > -1 && (now - this.epochStart) <= (rtt * 4)) {
      // we've already validated that maxStreamWindowSize can't be more than MAX_UINT32
      this.recvWindow = Math.min(this.recvWindow * 2, this.maxStreamWindowSize)
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
      streamID: this.streamId,
      length: delta
    })
  }
}
