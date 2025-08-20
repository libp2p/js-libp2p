import { connectionSymbol, LimitedConnectionError, ConnectionClosedError, ConnectionClosingError, TooManyOutboundProtocolStreamsError, TooManyInboundProtocolStreamsError } from '@libp2p/interface'
import * as mss from '@libp2p/multistream-select'
import { setMaxListeners } from 'main-event'
import { PROTOCOL_NEGOTIATION_TIMEOUT } from './connection-manager/constants.defaults.ts'
import { MuxerUnavailableError } from './errors.ts'
import { DEFAULT_MAX_INBOUND_STREAMS, DEFAULT_MAX_OUTBOUND_STREAMS } from './registrar.ts'
import type { AbortOptions, Logger, Direction, Connection as ConnectionInterface, Stream, ConnectionTimeline, ConnectionStatus, NewStreamOptions, PeerId, ConnectionLimits, StreamMuxerFactory, StreamMuxer, Metrics, PeerStore, MultiaddrConnection } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const CLOSE_TIMEOUT = 500

export interface ConnectionComponents {
  peerStore: PeerStore
  registrar: Registrar
  metrics?: Metrics
}

export interface ConnectionInit {
  id: string
  maConn: MultiaddrConnection
  remotePeer: PeerId
  direction?: Direction
  muxerFactory?: StreamMuxerFactory
  encryption?: string
  limits?: ConnectionLimits
  outboundStreamProtocolNegotiationTimeout?: number
  inboundStreamProtocolNegotiationTimeout?: number
}

/**
 * An implementation of the js-libp2p connection.
 * Any libp2p transport should use an upgrader to return this connection.
 */
export class Connection implements ConnectionInterface {
  public readonly id: string
  public readonly remoteAddr: Multiaddr
  public readonly remotePeer: PeerId
  public direction: Direction
  public timeline: ConnectionTimeline
  public multiplexer?: string
  public encryption?: string
  public status: ConnectionStatus
  public limits?: ConnectionLimits
  public readonly log: Logger
  public tags: string[]

  private readonly maConn: MultiaddrConnection
  private readonly muxer?: StreamMuxer
  private readonly components: ConnectionComponents
  private readonly outboundStreamProtocolNegotiationTimeout: number
  private readonly inboundStreamProtocolNegotiationTimeout: number

  constructor (components: ConnectionComponents, init: ConnectionInit) {
    this.components = components

    this.id = init.id
    this.remoteAddr = init.maConn.remoteAddr
    this.remotePeer = init.remotePeer
    this.direction = init.direction ?? 'outbound'
    this.status = 'open'
    this.timeline = init.maConn.timeline
    this.encryption = init.encryption
    this.limits = init.limits
    this.maConn = init.maConn
    this.log = init.maConn.log
    this.outboundStreamProtocolNegotiationTimeout = init.outboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT
    this.inboundStreamProtocolNegotiationTimeout = init.inboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT

    if (this.remoteAddr.getPeerId() == null) {
      this.remoteAddr = this.remoteAddr.encapsulate(`/p2p/${this.remotePeer}`)
    }

    this.tags = []

    if (init.muxerFactory != null) {
      this.multiplexer = init.muxerFactory.protocol

      this.muxer = init.muxerFactory.createStreamMuxer({
        direction: this.direction,
        log: this.log,
        // Run anytime a remote stream is created
        onIncomingStream: (stream) => {
          this.onIncomingStream(stream)
        }
      })

      // Pipe all data through the muxer
      void Promise.all([
        this.muxer.sink(this.maConn.source),
        this.maConn.sink(this.muxer.source)
      ]).catch(err => {
        this.log.error('error piping data through muxer - %e', err)
      })
    }
  }

  readonly [Symbol.toStringTag] = 'Connection'

  readonly [connectionSymbol] = true

  get streams (): Stream[] {
    return this.muxer?.streams ?? []
  }

  /**
   * Create a new stream over this connection
   */
  newStream = async (protocols: string[], options: NewStreamOptions = {}): Promise<Stream> => {
    if (this.status === 'closing') {
      throw new ConnectionClosingError('the connection is being closed')
    }

    if (this.status === 'closed') {
      throw new ConnectionClosedError('the connection is closed')
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    if (this.limits != null && options?.runOnLimitedConnection !== true) {
      throw new LimitedConnectionError('Cannot open protocol stream on limited connection')
    }

    if (this.muxer == null) {
      throw new MuxerUnavailableError('Connection is not multiplexed')
    }

    this.log.trace('starting new stream for protocols %s', protocols)
    const muxedStream = await this.muxer.newStream()
    this.log.trace('started new stream %s for protocols %s', muxedStream.id, protocols)

    try {
      if (options.signal == null) {
        muxedStream.log('no abort signal was passed while trying to negotiate protocols %s falling back to default timeout', protocols)

        const signal = AbortSignal.timeout(this.outboundStreamProtocolNegotiationTimeout)
        setMaxListeners(Infinity, signal)

        options = {
          ...options,
          signal
        }
      }

      muxedStream.log.trace('selecting protocol from protocols %s', protocols)

      const {
        stream,
        protocol
      } = await mss.select(muxedStream, protocols, {
        ...options,
        log: muxedStream.log,
        yieldBytes: true
      })

      muxedStream.log('selected protocol %s', protocol)

      const outgoingLimit = findOutgoingStreamLimit(protocol, this.components.registrar, options)
      const streamCount = countStreams(protocol, 'outbound', this)

      if (streamCount >= outgoingLimit) {
        const err = new TooManyOutboundProtocolStreamsError(`Too many outbound protocol streams for protocol "${protocol}" - ${streamCount}/${outgoingLimit}`)
        muxedStream.abort(err)

        throw err
      }

      // If a protocol stream has been successfully negotiated and is to be passed to the application,
      // the peer store should ensure that the peer is registered with that protocol
      await this.components.peerStore.merge(this.remotePeer, {
        protocols: [protocol]
      })

      // after the handshake the returned stream can have early data so override
      // the source/sink
      muxedStream.source = stream.source
      muxedStream.sink = stream.sink
      muxedStream.protocol = protocol

      // allow closing the write end of a not-yet-negotiated stream
      if (stream.closeWrite != null) {
        muxedStream.closeWrite = stream.closeWrite
      }

      // allow closing the read end of a not-yet-negotiated stream
      if (stream.closeRead != null) {
        muxedStream.closeRead = stream.closeRead
      }

      // make sure we don't try to negotiate a stream we are closing
      if (stream.close != null) {
        muxedStream.close = stream.close
      }

      this.components.metrics?.trackProtocolStream(muxedStream, this)

      muxedStream.direction = 'outbound'

      return muxedStream
    } catch (err: any) {
      this.log.error('could not create new outbound stream on connection %s %a for protocols %s - %e', this.direction === 'inbound' ? 'from' : 'to', this.remoteAddr, protocols, err)

      if (muxedStream.timeline.close == null) {
        muxedStream.abort(err)
      }

      throw err
    }
  }

  private onIncomingStream (muxedStream: Stream): void {
    const signal = AbortSignal.timeout(this.inboundStreamProtocolNegotiationTimeout)
    setMaxListeners(Infinity, signal)

    void Promise.resolve()
      .then(async () => {
        const protocols = this.components.registrar.getProtocols()

        const { stream, protocol } = await mss.handle(muxedStream, protocols, {
          signal,
          log: muxedStream.log,
          yieldBytes: false
        })

        this.log('incoming %s stream opened', protocol)

        const incomingLimit = findIncomingStreamLimit(protocol, this.components.registrar)
        const streamCount = countStreams(protocol, 'inbound', this)

        if (streamCount === incomingLimit) {
          const err = new TooManyInboundProtocolStreamsError(`Too many inbound protocol streams for protocol "${protocol}" - limit ${incomingLimit}`)
          muxedStream.abort(err)

          throw err
        }

        // after the handshake the returned stream can have early data so override
        // the source/sink
        muxedStream.source = stream.source
        muxedStream.sink = stream.sink
        muxedStream.protocol = protocol

        // allow closing the write end of a not-yet-negotiated stream
        if (stream.closeWrite != null) {
          muxedStream.closeWrite = stream.closeWrite
        }

        // allow closing the read end of a not-yet-negotiated stream
        if (stream.closeRead != null) {
          muxedStream.closeRead = stream.closeRead
        }

        // make sure we don't try to negotiate a stream we are closing
        if (stream.close != null) {
          muxedStream.close = stream.close
        }

        // If a protocol stream has been successfully negotiated and is to be passed to the application,
        // the peer store should ensure that the peer is registered with that protocol
        await this.components.peerStore.merge(this.remotePeer, {
          protocols: [protocol]
        }, {
          signal
        })

        this.components.metrics?.trackProtocolStream(muxedStream, this)

        const { handler, options } = this.components.registrar.getHandler(protocol)

        if (this.limits != null && options.runOnLimitedConnection !== true) {
          throw new LimitedConnectionError('Cannot open protocol stream on limited connection')
        }

        await handler({ connection: this, stream: muxedStream })
      })
      .catch(async err => {
        this.log.error('error handling incoming stream id %s - %e', muxedStream.id, err)

        muxedStream.abort(err)
      })
  }

  /**
   * Close the connection
   */
  async close (options: AbortOptions = {}): Promise<void> {
    if (this.status === 'closed' || this.status === 'closing') {
      return
    }

    this.log('closing connection to %a', this.remoteAddr)

    this.status = 'closing'

    if (options.signal == null) {
      const signal = AbortSignal.timeout(CLOSE_TIMEOUT)
      setMaxListeners(Infinity, signal)

      options = {
        ...options,
        signal
      }
    }

    try {
      this.log.trace('closing underlying transport')

      // ensure remaining streams are closed gracefully
      await this.muxer?.close(options)

      // close the underlying transport
      await this.maConn.close(options)

      this.log.trace('updating timeline with close time')

      this.status = 'closed'
      this.timeline.close = Date.now()
    } catch (err: any) {
      this.log.error('error encountered during graceful close of connection to %a', this.remoteAddr, err)
      this.abort(err)
    }
  }

  abort (err: Error): void {
    if (this.status === 'closed') {
      return
    }

    this.log.error('aborting connection to %a due to error', this.remoteAddr, err)

    this.status = 'closing'

    // ensure remaining streams are aborted
    this.muxer?.abort(err)

    // abort the underlying transport
    this.maConn.abort(err)

    this.status = 'closed'
    this.timeline.close = Date.now()
  }
}

export function createConnection (components: ConnectionComponents, init: ConnectionInit): ConnectionInterface {
  return new Connection(components, init)
}

function findIncomingStreamLimit (protocol: string, registrar: Registrar): number | undefined {
  try {
    const { options } = registrar.getHandler(protocol)

    return options.maxInboundStreams
  } catch (err: any) {
    if (err.name !== 'UnhandledProtocolError') {
      throw err
    }
  }

  return DEFAULT_MAX_INBOUND_STREAMS
}

function findOutgoingStreamLimit (protocol: string, registrar: Registrar, options: NewStreamOptions = {}): number {
  try {
    const { options } = registrar.getHandler(protocol)

    if (options.maxOutboundStreams != null) {
      return options.maxOutboundStreams
    }
  } catch (err: any) {
    if (err.name !== 'UnhandledProtocolError') {
      throw err
    }
  }

  return options.maxOutboundStreams ?? DEFAULT_MAX_OUTBOUND_STREAMS
}

function countStreams (protocol: string, direction: 'inbound' | 'outbound', connection: Connection): number {
  let streamCount = 0

  connection.streams.forEach(stream => {
    if (stream.direction === direction && stream.protocol === protocol) {
      streamCount++
    }
  })

  return streamCount
}
