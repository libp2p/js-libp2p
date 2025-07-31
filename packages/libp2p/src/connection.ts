import { connectionSymbol, LimitedConnectionError, ConnectionClosedError, ConnectionClosingError, TooManyOutboundProtocolStreamsError, TooManyInboundProtocolStreamsError, StreamCloseEvent } from '@libp2p/interface'
import * as mss from '@libp2p/multistream-select'
import { CODE_P2P } from '@multiformats/multiaddr'
import { setMaxListeners, TypedEventEmitter } from 'main-event'
import { PROTOCOL_NEGOTIATION_TIMEOUT } from './connection-manager/constants.defaults.ts'
import { MuxerUnavailableError } from './errors.ts'
import { DEFAULT_MAX_INBOUND_STREAMS, DEFAULT_MAX_OUTBOUND_STREAMS } from './registrar.ts'
import type { AbortOptions, Logger, StreamDirection, Connection as ConnectionInterface, Stream, NewStreamOptions, PeerId, ConnectionLimits, StreamMuxer, Metrics, PeerStore, MultiaddrConnection, MessageStreamEvents, MultiaddrConnectionTimeline, ConnectionStatus, MessageStream } from '@libp2p/interface'
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
  stream: MessageStream
  remotePeer: PeerId
  direction?: StreamDirection
  muxer?: StreamMuxer
  cryptoProtocol?: string
  limits?: ConnectionLimits
  outboundStreamProtocolNegotiationTimeout?: number
  inboundStreamProtocolNegotiationTimeout?: number
}

/**
 * An implementation of the js-libp2p connection.
 * Any libp2p transport should use an upgrader to return this connection.
 */
export class Connection extends TypedEventEmitter<MessageStreamEvents> implements ConnectionInterface {
  public readonly id: string
  public readonly remoteAddr: Multiaddr
  public readonly remotePeer: PeerId
  public direction: StreamDirection
  public timeline: MultiaddrConnectionTimeline
  public multiplexer?: string
  public encryption?: string
  public status: ConnectionStatus
  public limits?: ConnectionLimits
  public readonly log: Logger

  private readonly maConn: MultiaddrConnection
  private readonly muxer?: StreamMuxer
  private readonly components: ConnectionComponents
  private readonly outboundStreamProtocolNegotiationTimeout: number
  private readonly inboundStreamProtocolNegotiationTimeout: number

  constructor (components: ConnectionComponents, init: ConnectionInit) {
    super()

    this.components = components

    this.id = init.id
    this.remoteAddr = init.maConn.remoteAddr
    this.remotePeer = init.remotePeer
    this.direction = init.direction ?? 'outbound'
    this.status = 'open'
    this.timeline = init.maConn.timeline
    this.encryption = init.cryptoProtocol
    this.limits = init.limits
    this.maConn = init.maConn
    this.log = init.maConn.log
    this.outboundStreamProtocolNegotiationTimeout = init.outboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT
    this.inboundStreamProtocolNegotiationTimeout = init.inboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT

    this.onIncomingStream = this.onIncomingStream.bind(this)

    if (this.remoteAddr.getComponents().find(component => component.code === CODE_P2P) == null) {
      this.remoteAddr = this.remoteAddr.encapsulate(`/p2p/${this.remotePeer}`)
    }

    if (init.muxer != null) {
      this.multiplexer = init.muxer.protocol
      this.muxer = init.muxer
      this.muxer.addEventListener('stream', this.onIncomingStream)
    }

    this.maConn.addEventListener('close', (evt) => {
      this.dispatchEvent(new StreamCloseEvent(evt.local, evt.error))
    })
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
    const muxedStream = await this.muxer.createStream({
      ...options,

      // most underlying transports only support negotiating a single protocol
      // so only pass the early protocol if a single protocol has been requested
      // otherwise fall back to mss
      protocol: protocols.length === 1 ? protocols[0] : undefined
    })
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

      if (muxedStream.protocol === '') {
        muxedStream.log.trace('selecting protocol from protocols %s', protocols)

        muxedStream.protocol = await mss.select(muxedStream, protocols, options)

        muxedStream.log('negotiated protocol %s', muxedStream.protocol)
      } else {
        muxedStream.log('pre-negotiated protocol %s', muxedStream.protocol)
      }

      const outgoingLimit = findOutgoingStreamLimit(muxedStream.protocol, this.components.registrar, options)
      const streamCount = countStreams(muxedStream.protocol, 'outbound', this)

      if (streamCount > outgoingLimit) {
        const err = new TooManyOutboundProtocolStreamsError(`Too many outbound protocol streams for protocol "${muxedStream.protocol}" - ${streamCount}/${outgoingLimit}`)
        muxedStream.abort(err)

        throw err
      }

      // If a protocol stream has been successfully negotiated and is to be passed to the application,
      // the peer store should ensure that the peer is registered with that protocol
      await this.components.peerStore.merge(this.remotePeer, {
        protocols: [muxedStream.protocol]
      })

      this.components.metrics?.trackProtocolStream(muxedStream)

      return muxedStream
    } catch (err: any) {
      if (muxedStream.status === 'open') {
        muxedStream.abort(err)
      } else {
        this.log.error('could not create new outbound stream on connection %s %a for protocols %s - %e', this.direction === 'inbound' ? 'from' : 'to', this.remoteAddr, protocols, err)
      }

      throw err
    }
  }

  private onIncomingStream (evt: CustomEvent<Stream>): void {
    const muxedStream = evt.detail

    const signal = AbortSignal.timeout(this.inboundStreamProtocolNegotiationTimeout)
    setMaxListeners(Infinity, signal)

    void Promise.resolve()
      .then(async () => {
        if (muxedStream.protocol === '') {
          const protocols = this.components.registrar.getProtocols()

          muxedStream.log.trace('selecting protocol from protocols %s', protocols)

          muxedStream.protocol = await mss.handle(muxedStream, protocols, {
            signal
          })

          muxedStream.log('negotiated protocol %s', muxedStream.protocol)
        } else {
          muxedStream.log('pre-negotiated protocol %s', muxedStream.protocol)
        }

        const incomingLimit = findIncomingStreamLimit(muxedStream.protocol, this.components.registrar)
        const streamCount = countStreams(muxedStream.protocol, 'inbound', this)

        if (streamCount > incomingLimit) {
          throw new TooManyInboundProtocolStreamsError(`Too many inbound protocol streams for protocol "${muxedStream.protocol}" - limit ${incomingLimit}`)
        }

        // If a protocol stream has been successfully negotiated and is to be passed to the application,
        // the peer store should ensure that the peer is registered with that protocol
        await this.components.peerStore.merge(this.remotePeer, {
          protocols: [muxedStream.protocol]
        }, {
          signal
        })

        this.components.metrics?.trackProtocolStream(muxedStream)

        const { handler, options } = this.components.registrar.getHandler(muxedStream.protocol)

        if (this.limits != null && options.runOnLimitedConnection !== true) {
          throw new LimitedConnectionError('Cannot open protocol stream on limited connection')
        }

        await handler(muxedStream, this)
      })
      .catch(async err => {
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

    this.status = 'closing'

    // abort the underlying transport
    this.maConn.abort(err)

    this.status = 'closed'
  }
}

export function createConnection (components: ConnectionComponents, init: ConnectionInit): ConnectionInterface {
  return new Connection(components, init)
}

function findIncomingStreamLimit (protocol: string, registrar: Registrar): number {
  try {
    const { options } = registrar.getHandler(protocol)

    if (options.maxInboundStreams != null) {
      return options.maxInboundStreams
    }
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
