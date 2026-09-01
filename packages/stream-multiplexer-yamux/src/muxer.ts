import { InvalidParametersError, MuxerClosedError, TooManyOutboundProtocolStreamsError, serviceCapabilities } from '@libp2p/interface'
import { AbstractStreamMuxer, repeatingTask } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { defaultConfig, verifyConfig } from './config.js'
import { Decoder } from './decode.js'
import { encodeHeader } from './encode.js'
import { InvalidFrameError, isProtocolError, NotMatchingPingError, UnRequestedPingError } from './errors.js'
import { Flag, FrameType, GoAwayCode } from './frame.js'
import { StreamState, YamuxStream } from './stream.js'
import type { Config } from './config.js'
import type { Frame } from './decode.js'
import type { FrameHeader } from './frame.js'
import type { AbortOptions, MessageStream, StreamMuxerFactory } from '@libp2p/interface'
import type { RepeatingTask } from '@libp2p/utils'

function debugFrame (header: FrameHeader): any {
  return {
    type: FrameType[header.type],
    flags: [
      (header.flag & Flag.SYN) === Flag.SYN ? 'SYN' : undefined,
      (header.flag & Flag.ACK) === Flag.ACK ? 'ACK' : undefined,
      (header.flag & Flag.FIN) === Flag.FIN ? 'FIN' : undefined,
      (header.flag & Flag.RST) === Flag.RST ? 'RST' : undefined
    ].filter(Boolean),
    streamID: header.streamID,
    length: header.length
  }
}

const YAMUX_PROTOCOL_ID = '/yamux/1.0.0'

export interface YamuxMuxerInit extends Partial<Config> {
}

export class Yamux implements StreamMuxerFactory {
  protocol = YAMUX_PROTOCOL_ID
  private readonly _init: Partial<Config>

  constructor (init: Partial<Config> = {}) {
    this._init = init
  }

  readonly [Symbol.toStringTag] = '@chainsafe/libp2p-yamux'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/stream-multiplexing'
  ]

  createStreamMuxer (maConn: MessageStream): YamuxMuxer {
    return new YamuxMuxer(maConn, {
      ...this._init
    })
  }
}

export interface CloseOptions extends AbortOptions {
  reason?: GoAwayCode
}

export interface ActivePing extends PromiseWithResolvers<number> {
  id: number
  start: number
}

export class YamuxMuxer extends AbstractStreamMuxer<YamuxStream> {
  /** The next stream id to be used when initiating a new stream */
  private nextStreamID: number

  /** The next ping id to be used when pinging */
  private nextPingID: number
  /** Tracking info for the currently active ping */
  private activePing?: ActivePing
  /** Round trip time */
  private rtt: number

  /** True if client, false if server */
  private client: boolean

  private localGoAway?: GoAwayCode
  private remoteGoAway?: GoAwayCode

  /** Number of tracked inbound streams */
  private numInboundStreams: number
  /** Number of tracked outbound streams */
  private numOutboundStreams: number

  private decoder: Decoder
  private keepAlive?: RepeatingTask

  private enableKeepAlive: boolean
  private keepAliveInterval: number
  private maxInboundStreams: number
  private maxOutboundStreams: number

  constructor (maConn: MessageStream, init: YamuxMuxerInit = {}) {
    super(maConn, {
      ...init,
      protocol: YAMUX_PROTOCOL_ID,
      name: 'yamux'
    })

    this.client = maConn.direction === 'outbound'
    verifyConfig(init)

    this.enableKeepAlive = init.enableKeepAlive ?? defaultConfig.enableKeepAlive
    this.keepAliveInterval = init.keepAliveInterval ?? defaultConfig.keepAliveInterval
    this.maxInboundStreams = init.maxInboundStreams ?? defaultConfig.maxInboundStreams
    this.maxOutboundStreams = init.maxOutboundStreams ?? defaultConfig.maxOutboundStreams

    this.decoder = new Decoder()

    this.numInboundStreams = 0
    this.numOutboundStreams = 0

    // client uses odd streamIDs, server uses even streamIDs
    this.nextStreamID = this.client ? 1 : 2

    this.nextPingID = 0
    this.rtt = -1

    this.log.trace('muxer created')

    if (this.enableKeepAlive) {
      this.log.trace('muxer keepalive enabled interval=%s', this.keepAliveInterval)
      this.keepAlive = repeatingTask(async (options) => {
        try {
          await this.ping(options)
        } catch (err: any) {
          // TODO: should abort here?
          this.log.error('ping error: %s', err)
        }
      }, this.keepAliveInterval, {
        // send an initial ping to establish RTT
        runImmediately: true
      })
      this.keepAlive.start()
    }
  }

  onData (buf: Uint8Array | Uint8ArrayList): void {
    for (const frame of this.decoder.emitFrames(buf)) {
      this.handleFrame(frame)
    }
  }

  onCreateStream (): YamuxStream {
    if (this.remoteGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed remotely')
    }

    if (this.localGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed locally')
    }

    const id = this.nextStreamID
    this.nextStreamID += 2

    // check against our configured maximum number of outbound streams
    if (this.numOutboundStreams >= this.maxOutboundStreams) {
      throw new TooManyOutboundProtocolStreamsError('max outbound streams exceeded')
    }

    this.log.trace('new outgoing stream id=%s', id)

    const stream = this._newStream(id, StreamState.Init, 'outbound')

    this.numOutboundStreams++

    // send a window update to open the stream on the receiver end. do this in a
    // microtask so the stream gets added to the streams array by the superclass
    // before we send the SYN flag, otherwise we create a race condition whereby
    // we can receive the ACK before the stream is added to the streams list
    queueMicrotask(() => {
      stream.sendWindowUpdate()
    })

    return stream
  }

  /**
   * Initiate a ping and wait for a response
   *
   * Note: only a single ping will be initiated at a time.
   * If a ping is already in progress, a new ping will not be initiated.
   *
   * @returns the round-trip-time in milliseconds
   */
  async ping (options?: AbortOptions): Promise<number> {
    if (this.remoteGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed remotely')
    }
    if (this.localGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed locally')
    }

    if (this.activePing != null) {
      // an active ping is already in progress, piggyback off that
      return raceSignal(this.activePing.promise, options?.signal)
    }

    // An active ping does not yet exist, handle the process here
    // create active ping
    this.activePing = Object.assign(Promise.withResolvers<number>(), {
      id: this.nextPingID++,
      start: Date.now()
    })
    // send ping
    this.sendPing(this.activePing.id)
    // await pong
    try {
      this.rtt = await raceSignal(this.activePing.promise, options?.signal)
    } finally {
      // clean-up active ping
      this.activePing = undefined
    }

    return this.rtt
  }

  /**
   * Get the ping round trip time
   *
   * Note: Will return 0 if no successful ping has yet been completed
   *
   * @returns the round-trip-time in milliseconds
   */
  getRTT (): number {
    return this.rtt
  }

  /**
   * Close the muxer
   */
  async close (options: CloseOptions = {}): Promise<void> {
    if (this.status !== 'open') {
      // already closed
      return
    }

    try {
      const reason = options?.reason ?? GoAwayCode.NormalTermination

      this.log.trace('muxer close reason=%s', GoAwayCode[reason])

      await super.close(options)

      // send reason to the other side, allow the other side to close gracefully
      this.sendGoAway(reason)
    } finally {
      this.keepAlive?.stop()
    }
  }

  abort (err: Error): void {
    if (this.status !== 'open') {
      // already closed
      return
    }

    try {
      super.abort(err)

      let reason = GoAwayCode.InternalError

      if (isProtocolError(err)) {
        reason = err.reason
      }

      // If reason was provided, use that, otherwise use the presence of `err` to determine the reason
      this.log.error('muxer abort reason=%s error=%s', reason, err)

      // send reason to the other side, allow the other side to close gracefully
      this.sendGoAway(reason)
    } finally {
      this.keepAlive?.stop()
    }
  }

  onTransportClosed (): void {
    try {
      super.onTransportClosed()
    } finally {
      this.keepAlive?.stop()
    }
  }

  /** Create a new stream */
  private _newStream (streamId: number, state: StreamState, direction: 'inbound' | 'outbound'): YamuxStream {
    if (this.streams.find(s => s.streamId === streamId) != null) {
      throw new InvalidParametersError('Stream already exists with that id')
    }

    const stream = new YamuxStream({
      ...this.streamOptions,
      id: `${streamId}`,
      streamId,
      state,
      direction,
      sendFrame: this.sendFrame.bind(this),
      log: this.log.newScope(`${direction}:${streamId}`),
      getRTT: this.getRTT.bind(this)
    })

    stream.addEventListener('close', () => {
      this.closeStream(streamId)
    }, {
      once: true
    })

    return stream
  }

  /**
   * closeStream is used to close a stream once both sides have
   * issued a close.
   */
  private closeStream (id: number): void {
    if (this.client === (id % 2 === 0)) {
      this.numInboundStreams--
    } else {
      this.numOutboundStreams--
    }
  }

  private handleFrame (frame: Frame): void {
    const {
      streamID,
      type,
      length
    } = frame.header

    this.log.trace('received frame %o', debugFrame(frame.header))

    if (streamID === 0) {
      switch (type) {
        case FrameType.Ping:
        { this.handlePing(frame.header); return }
        case FrameType.GoAway:
        { this.handleGoAway(length); return }
        default:
          // Invalid state
          throw new InvalidFrameError('Invalid frame type')
      }
    } else {
      switch (frame.header.type) {
        case FrameType.Data:
        case FrameType.WindowUpdate:
        { this.handleStreamMessage(frame); return }
        default:
          // Invalid state
          throw new InvalidFrameError('Invalid frame type')
      }
    }
  }

  private handlePing (header: FrameHeader): void {
    // If the ping  is initiated by the sender, send a response
    if (header.flag === Flag.SYN) {
      this.log.trace('received ping request pingId=%s', header.length)
      this.sendPing(header.length, Flag.ACK)
    } else if (header.flag === Flag.ACK) {
      this.log.trace('received ping response pingId=%s', header.length)
      this.handlePingResponse(header.length)
    } else {
      // Invalid state
      throw new InvalidFrameError('Invalid frame flag')
    }
  }

  private handlePingResponse (pingId: number): void {
    if (this.activePing === undefined) {
      // this ping was not requested
      throw new UnRequestedPingError('ping not requested')
    }
    if (this.activePing.id !== pingId) {
      // this ping doesn't match our active ping request
      throw new NotMatchingPingError('ping doesn\'t match our id')
    }

    // valid ping response
    this.activePing.resolve(Date.now() - this.activePing.start)
  }

  private handleGoAway (reason: GoAwayCode): void {
    this.log.trace('received GoAway reason=%s', GoAwayCode[reason] ?? 'unknown')
    this.remoteGoAway = reason

    if (reason === GoAwayCode.NormalTermination) {
      this.onTransportClosed()
    } else {
      // reset any streams that are still open and close the muxer
      this.abort(new Error('Remote sent GoAway'))
    }
  }

  private handleStreamMessage (frame: Frame): void {
    const { streamID, flag, type } = frame.header

    if ((flag & Flag.SYN) === Flag.SYN) {
      this.incomingStream(streamID)
    }

    const stream = this.streams.find(s => s.streamId === streamID)
    if (stream === undefined) {
      this.log.trace('frame for missing stream id=%s', streamID)

      return
    }

    switch (type) {
      case FrameType.WindowUpdate: {
        stream.handleWindowUpdate(frame); return
      }
      case FrameType.Data: {
        stream.handleData(frame); return
      }
      default:
        throw new Error('unreachable')
    }
  }

  private incomingStream (id: number): void {
    if (this.client !== (id % 2 === 0)) {
      throw new InvalidParametersError('Both endpoints are clients')
    }
    if (this.streams.find(s => s.streamId === id)) {
      return
    }

    this.log.trace('new incoming stream id=%s', id)

    if (this.localGoAway !== undefined) {
      // reject (reset) immediately if we are doing a go away
      this.sendFrame({
        type: FrameType.WindowUpdate,
        flag: Flag.RST,
        streamID: id,
        length: 0
      })
      return
    }

    // check against our configured maximum number of inbound streams
    if (this.numInboundStreams >= this.maxInboundStreams) {
      this.log('maxIncomingStreams exceeded, forcing stream reset')
      this.sendFrame({
        type: FrameType.WindowUpdate,
        flag: Flag.RST,
        streamID: id,
        length: 0
      })
      return
    }

    // allocate a new stream
    const stream = this._newStream(id, StreamState.SYNReceived, 'inbound')

    this.numInboundStreams++

    // the stream should now be tracked
    this.onRemoteStream(stream)
  }

  private sendFrame (header: FrameHeader, data?: Uint8ArrayList): boolean {
    let encoded: Uint8Array | Uint8ArrayList

    if (header.type === FrameType.Data) {
      if (data == null) {
        throw new InvalidFrameError('Invalid frame')
      }

      encoded = new Uint8ArrayList(encodeHeader(header), data)
    } else {
      encoded = encodeHeader(header)
    }

    this.log.trace('sending frame %o', debugFrame(header))

    return this.send(encoded)
  }

  private sendPing (pingId: number, flag: Flag = Flag.SYN): void {
    if (flag === Flag.SYN) {
      this.log.trace('sending ping request pingId=%s', pingId)
    } else {
      this.log.trace('sending ping response pingId=%s', pingId)
    }
    this.sendFrame({
      type: FrameType.Ping,
      flag,
      streamID: 0,
      length: pingId
    })
  }

  private sendGoAway (reason: GoAwayCode = GoAwayCode.NormalTermination): void {
    this.log('sending GoAway reason=%s', GoAwayCode[reason])
    this.localGoAway = reason
    this.sendFrame({
      type: FrameType.GoAway,
      flag: 0,
      streamID: 0,
      length: reason
    })
  }
}
