import { InvalidParametersError, MuxerClosedError, TooManyOutboundProtocolStreamsError, serviceCapabilities, setMaxListeners } from '@libp2p/interface'
import { AbstractStreamMuxer } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { defaultConfig, verifyConfig } from './config.js'
import { Decoder } from './decode.js'
import { encodeHeader } from './encode.js'
import { InvalidFrameError, isProtocolError, NotMatchingPingError, UnrequestedPingError } from './errors.js'
import { Flag, FrameType, GoAwayCode } from './frame.js'
import { StreamState, YamuxStream } from './stream.js'
import type { Config } from './config.js'
import type { Frame } from './decode.js'
import type { FrameHeader } from './frame.js'
import type { AbortOptions, MultiaddrConnection, StreamMuxerFactory } from '@libp2p/interface'

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

  createStreamMuxer (maConn: MultiaddrConnection): YamuxMuxer {
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
  private readonly config: Config

  /** Used to close the muxer from either the sink or source */
  private readonly closeController: AbortController

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

  constructor (maConn: MultiaddrConnection, init: YamuxMuxerInit = {}) {
    super(maConn, {
      protocol: YAMUX_PROTOCOL_ID,
      name: 'yamux'
    })

    this.client = maConn.direction === 'outbound'
    this.config = { ...defaultConfig, ...init }
    verifyConfig(this.config)

    this.closeController = new AbortController()
    setMaxListeners(Infinity, this.closeController.signal)

    this.decoder = new Decoder()

    this.numInboundStreams = 0
    this.numOutboundStreams = 0

    // client uses odd streamIDs, server uses even streamIDs
    this.nextStreamID = this.client ? 1 : 2

    this.nextPingID = 0
    this.rtt = -1

    this.log.trace('muxer created')

    queueMicrotask(() => {
      if (this.status !== 'open') {
        return
      }

      if (this.config.enableKeepAlive) {
        this.keepAliveLoop().catch(e => this.log.error('keepalive error: %s', e))
      }

      // send an initial ping to establish RTT
      this.ping().catch(e => this.log.error('ping error: %s', e))
    })
  }

  onData (buf: Uint8Array): void {
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
    if (this.numOutboundStreams >= this.config.maxOutboundStreams) {
      throw new TooManyOutboundProtocolStreamsError('max outbound streams exceeded')
    }

    this.log.trace('new outgoing stream id=%s', id)

    const stream = this._newStream(id, StreamState.Init, 'outbound')

    this.numOutboundStreams++

    // send a window update to open the stream on the receiver end
    stream.sendWindowUpdate()

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
  async ping (): Promise<number> {
    if (this.remoteGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed remotely')
    }
    if (this.localGoAway !== undefined) {
      throw new MuxerClosedError('Muxer closed locally')
    }

    if (this.activePing != null) {
      // an active ping is already in progress, piggyback off that
      return raceSignal(this.activePing.promise, this.closeController.signal)
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
      this.rtt = await raceSignal(this.activePing.promise, this.closeController.signal)
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

    const reason = options?.reason ?? GoAwayCode.NormalTermination

    this.log.trace('muxer close reason=%s', GoAwayCode[reason])

    await super.close(options)

    // send reason to the other side, allow the other side to close gracefully
    this.sendGoAway(reason)

    this.closeController.abort()
  }

  abort (err: Error): void {
    if (this.status !== 'open') {
      // already closed
      return
    }

    super.abort(err)

    let reason = GoAwayCode.InternalError

    if (isProtocolError(err)) {
      reason = err.reason
    }

    // If reason was provided, use that, otherwise use the presence of `err` to determine the reason
    this.log.error('muxer abort reason=%s error=%s', reason, err)

    // send reason to the other side, allow the other side to close gracefully
    this.sendGoAway(reason)

    this.closeController.abort()
  }

  onRemoteClose (): void {
    super.onRemoteClose()

    this.closeController.abort()
  }

  /** Create a new stream */
  private _newStream (streamId: number, state: StreamState, direction: 'inbound' | 'outbound'): YamuxStream {
    if (this.streams.find(s => s.streamId === streamId) != null) {
      throw new InvalidParametersError('Stream already exists with that id')
    }

    const stream = new YamuxStream({
      id: `${streamId}`,
      streamId,
      state,
      direction,
      sendFrame: this.sendFrame.bind(this),
      log: this.log.newScope(`${direction}:${streamId}`),
      config: this.config,
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

  private async keepAliveLoop (): Promise<void> {
    this.log.trace('muxer keepalive enabled interval=%s', this.config.keepAliveInterval)
    while (true) {
      let timeoutId
      try {
        await raceSignal(
          new Promise((resolve) => {
            timeoutId = setTimeout(resolve, this.config.keepAliveInterval)
          }),
          this.closeController.signal
        )
        this.ping().catch(e => this.log.error('ping error: %s', e))
      } catch (e) {
        // closed
        clearInterval(timeoutId)
        return
      }
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
      throw new UnrequestedPingError('ping not requested')
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

    // If the other side is friendly, they would have already closed all streams
    // before sending a GoAway
    if (this.streams.length === 0) {
      this.onRemoteClose()

      return
    }

    // In case they weren't, reset all streams
    this.abort(new Error('Remote sent GoAway'))
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
    if (this.numInboundStreams >= this.config.maxInboundStreams) {
      this.log('maxIncomingStreams exceeded, forcing stream reset')
      this.sendFrame({
        type: FrameType.WindowUpdate,
        flag: Flag.RST,
        streamID: id,
        length: 0
      }); return
    }

    // allocate a new stream
    const stream = this._newStream(id, StreamState.SYNReceived, 'inbound')
    this.onRemoteStream(stream)

    this.numInboundStreams++
    // the stream should now be tracked
  }

  private sendFrame (header: FrameHeader, data?: Uint8ArrayList): boolean {
    this.log.trace('sending frame %o', debugFrame(header))
    if (header.type === FrameType.Data) {
      if (data === undefined) {
        throw new InvalidFrameError('Invalid frame')
      }

      return this.send(new Uint8ArrayList(encodeHeader(header), data))
    } else {
      return this.send(encodeHeader(header))
    }
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
