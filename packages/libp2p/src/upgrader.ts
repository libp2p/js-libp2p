import { InvalidMultiaddrError, InvalidPeerIdError } from '@libp2p/interface'
import * as mss from '@libp2p/multistream-select'
import { peerIdFromString } from '@libp2p/peer-id'
import { trackedMap } from '@libp2p/utils'
import { CODE_P2P } from '@multiformats/multiaddr'
import { anySignal } from 'any-signal'
import { setMaxListeners } from 'main-event'
import { CustomProgressEvent } from 'progress-events'
import { raceSignal } from 'race-signal'
import { PROTOCOL_NEGOTIATION_TIMEOUT, INBOUND_UPGRADE_TIMEOUT, CONNECTION_CLOSE_TIMEOUT } from './connection-manager/constants.js'
import { createConnection } from './connection.js'
import { ConnectionDeniedError, ConnectionInterceptedError, EncryptionFailedError, MuxerUnavailableError } from './errors.js'
import type { Libp2pEvents, AbortOptions, ComponentLogger, MultiaddrConnection, Connection, ConnectionProtector, ConnectionEncrypter, ConnectionGater, Metrics, PeerId, PeerStore, StreamMuxerFactory, Upgrader as UpgraderInterface, UpgraderOptions, ConnectionLimits, CounterGroup, ClearableSignal, MessageStream, SecuredConnection, StreamMuxer, UpgraderWithoutEncryptionOptions, SecureConnectionOptions } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

interface CreateConnectionOptions {
  id: string
  cryptoProtocol: string
  direction: 'inbound' | 'outbound'

  /**
   * The raw underlying connection
   */
  maConn: MultiaddrConnection

  /**
   * The encrypted, multiplexed connection
   */
  stream: MessageStream

  remotePeer: PeerId
  muxer?: StreamMuxer
  limits?: ConnectionLimits
  closeTimeout?: number
}

export interface UpgraderInit {
  connectionEncrypters: ConnectionEncrypter[]
  streamMuxers: StreamMuxerFactory[]

  /**
   * An amount of ms by which an inbound connection upgrade must complete
   *
   * @default 3000
   */
  inboundUpgradeTimeout?: number

  /**
   * When a new incoming stream is opened on a multiplexed connection, protocol
   * negotiation on that stream must complete within this many ms
   *
   * @default 2000
   */
  inboundStreamProtocolNegotiationTimeout?: number

  /**
   * When a new incoming stream is opened on a multiplexed connection, protocol
   * negotiation on that stream must complete within this many ms
   *
   * @default 2000
   */
  outboundStreamProtocolNegotiationTimeout?: number

  /**
   * How long to wait before closing a connection
   *
   * @default 1_000
   */
  connectionCloseTimeout?: number
}

export interface UpgraderComponents {
  peerId: PeerId
  metrics?: Metrics
  connectionManager: ConnectionManager
  connectionGater: ConnectionGater
  connectionProtector?: ConnectionProtector
  registrar: Registrar
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

interface EncryptedConnection extends SecuredConnection {
  protocol: string
}

type ConnectionDeniedType = keyof Pick<ConnectionGater, 'denyOutboundConnection' | 'denyInboundEncryptedConnection' | 'denyOutboundEncryptedConnection' | 'denyInboundUpgradedConnection' | 'denyOutboundUpgradedConnection'>

export class Upgrader implements UpgraderInterface {
  private readonly components: UpgraderComponents
  private readonly connectionEncrypters: Map<string, ConnectionEncrypter>
  private readonly streamMuxers: Map<string, StreamMuxerFactory>
  private readonly inboundUpgradeTimeout: number
  private readonly inboundStreamProtocolNegotiationTimeout: number
  private readonly outboundStreamProtocolNegotiationTimeout: number
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly metrics: {
    dials?: CounterGroup<'inbound' | 'outbound'>
    errors?: CounterGroup<'inbound' | 'outbound'>
    inboundErrors?: CounterGroup
    outboundErrors?: CounterGroup
  }

  private readonly connectionCloseTimeout?: number

  constructor (components: UpgraderComponents, init: UpgraderInit) {
    this.components = components
    this.connectionEncrypters = trackedMap({
      name: 'libp2p_upgrader_connection_encrypters',
      metrics: this.components.metrics
    })

    init.connectionEncrypters.forEach(encrypter => {
      this.connectionEncrypters.set(encrypter.protocol, encrypter)
    })

    this.streamMuxers = trackedMap({
      name: 'libp2p_upgrader_stream_multiplexers',
      metrics: this.components.metrics
    })

    init.streamMuxers.forEach(muxer => {
      this.streamMuxers.set(muxer.protocol, muxer)
    })

    this.inboundUpgradeTimeout = init.inboundUpgradeTimeout ?? INBOUND_UPGRADE_TIMEOUT
    this.inboundStreamProtocolNegotiationTimeout = init.inboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT
    this.outboundStreamProtocolNegotiationTimeout = init.outboundStreamProtocolNegotiationTimeout ?? PROTOCOL_NEGOTIATION_TIMEOUT
    this.connectionCloseTimeout = init.connectionCloseTimeout ?? CONNECTION_CLOSE_TIMEOUT
    this.events = components.events
    this.metrics = {
      dials: components.metrics?.registerCounterGroup('libp2p_connection_manager_dials_total'),
      errors: components.metrics?.registerCounterGroup('libp2p_connection_manager_dial_errors_total'),
      inboundErrors: components.metrics?.registerCounterGroup('libp2p_connection_manager_dials_inbound_errors_total'),
      outboundErrors: components.metrics?.registerCounterGroup('libp2p_connection_manager_dials_outbound_errors_total')
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/upgrader'

  async shouldBlockConnection (connectionType: 'denyInboundConnection', maConn: MultiaddrConnection): Promise<void>
  async shouldBlockConnection (connectionType: ConnectionDeniedType, remotePeer: PeerId, maConn: MultiaddrConnection): Promise<void>
  async shouldBlockConnection (method: ConnectionDeniedType | 'denyInboundConnection', ...args: any[]): Promise<void> {
    const denyOperation: any = this.components.connectionGater[method]

    if (denyOperation == null) {
      return
    }

    const result = await denyOperation.apply(this.components.connectionGater, args)

    if (result === true) {
      throw new ConnectionInterceptedError(`The multiaddr connection is blocked by gater.${method}`)
    }
  }

  createInboundAbortSignal (signal: AbortSignal): ClearableSignal {
    const output = anySignal([
      AbortSignal.timeout(this.inboundUpgradeTimeout),
      signal
    ])
    setMaxListeners(Infinity, output)

    return output
  }

  /**
   * Upgrades an inbound connection
   */
  async upgradeInbound (maConn: MultiaddrConnection, opts: UpgraderOptions): Promise<void>
  async upgradeInbound (maConn: MultiaddrConnection, opts: UpgraderWithoutEncryptionOptions): Promise<void>
  async upgradeInbound (maConn: MultiaddrConnection, opts: UpgraderOptions | UpgraderWithoutEncryptionOptions): Promise<void> {
    let accepted = false

    // always apply upgrade timeout for incoming upgrades
    const signal = this.createInboundAbortSignal(opts.signal)

    try {
      this.metrics.dials?.increment({
        inbound: true
      })

      accepted = this.components.connectionManager.acceptIncomingConnection(maConn)

      if (!accepted) {
        throw new ConnectionDeniedError('Connection denied')
      }

      await raceSignal(this.shouldBlockConnection('denyInboundConnection', maConn), signal)

      await this._performUpgrade(maConn, 'inbound', {
        ...opts,
        signal
      })
    } catch (err: any) {
      this.metrics.errors?.increment({
        inbound: true
      })
      this.metrics.inboundErrors?.increment({
        [err.name ?? 'Error']: true
      })

      throw err
    } finally {
      signal.clear()

      if (accepted) {
        this.components.connectionManager.afterUpgradeInbound()
      }
    }
  }

  /**
   * Upgrades an outbound connection
   */
  async upgradeOutbound (maConn: MultiaddrConnection, opts: UpgraderOptions): Promise<Connection>
  async upgradeOutbound (maConn: MultiaddrConnection, opts: UpgraderWithoutEncryptionOptions): Promise<Connection>
  async upgradeOutbound (maConn: MultiaddrConnection, opts: UpgraderOptions | UpgraderWithoutEncryptionOptions): Promise<Connection> {
    try {
      this.metrics.dials?.increment({
        outbound: true
      })

      const idStr = maConn.remoteAddr.getComponents().findLast(c => c.code === CODE_P2P)?.value
      let remotePeerId: PeerId | undefined

      if (idStr != null) {
        remotePeerId = peerIdFromString(idStr)
        await raceSignal(this.shouldBlockConnection('denyOutboundConnection', remotePeerId, maConn), opts.signal)
      }

      let direction: 'inbound' | 'outbound' = 'outbound'

      // act as the multistream-select server if we are not to be the initiator
      if (opts.initiator === false) {
        direction = 'inbound'
      }

      return await this._performUpgrade(maConn, direction, opts)
    } catch (err: any) {
      this.metrics.errors?.increment({
        outbound: true
      })
      this.metrics.outboundErrors?.increment({
        [err.name ?? 'Error']: true
      })

      throw err
    }
  }

  private async _performUpgrade (maConn: MultiaddrConnection, direction: 'inbound' | 'outbound', opts: UpgraderOptions | UpgraderWithoutEncryptionOptions): Promise<Connection> {
    let stream: MessageStream = maConn
    let remotePeer: PeerId
    let muxerFactory: StreamMuxerFactory | undefined
    let muxer: StreamMuxer | undefined
    let cryptoProtocol

    const id = `${(parseInt(String(Math.random() * 1e9))).toString(36)}${Date.now()}`
    maConn.log = maConn.log.newScope(`${direction}:${id}`)

    this.components.metrics?.trackMultiaddrConnection(maConn)

    maConn.log.trace('starting the %s connection upgrade', direction)

    // Protect
    if (opts?.skipProtection !== true) {
      const protector = this.components.connectionProtector

      if (protector != null) {
        maConn.log('protecting the %s connection', direction)
        stream = await protector.protect(stream, opts)
      }
    }

    try {
      // Encrypt the connection
      if (isEncryptionSkipped(opts)) {
        if (opts.remotePeer == null) {
          throw new InvalidMultiaddrError(`${direction} connection that skipped encryption must have a peer id`)
        }

        cryptoProtocol = 'native'
        remotePeer = opts.remotePeer
      } else {
        const peerIdString = maConn.remoteAddr.getComponents().findLast(c => c.code === CODE_P2P)?.value
        let remotePeerFromMultiaddr: PeerId | undefined

        if (peerIdString != null) {
          remotePeerFromMultiaddr = peerIdFromString(peerIdString)
        }

        opts?.onProgress?.(new CustomProgressEvent(`upgrader:encrypt-${direction}-connection`));

        ({
          connection: stream,
          remotePeer,
          protocol: cryptoProtocol,
          streamMuxer: muxerFactory
        } = await (direction === 'inbound'
          ? this._encryptInbound(stream, {
            ...opts,
            remotePeer: remotePeerFromMultiaddr
          })
          : this._encryptOutbound(stream, {
            ...opts,
            remotePeer: remotePeerFromMultiaddr
          })
        ))
      }

      // this can happen if we dial a multiaddr without a peer id, we only find
      // out the identity of the remote after the connection is encrypted
      if (remotePeer.equals(this.components.peerId)) {
        const err = new InvalidPeerIdError('Can not dial self')
        maConn.abort(err)
        throw err
      }

      // stream.pause()
      await this.shouldBlockConnection(direction === 'inbound' ? 'denyInboundEncryptedConnection' : 'denyOutboundEncryptedConnection', remotePeer, maConn)
      // stream.resume()

      if (opts?.muxerFactory != null) {
        muxerFactory = opts.muxerFactory
      } else if (muxerFactory == null && this.streamMuxers.size > 0) {
        opts?.onProgress?.(new CustomProgressEvent(`upgrader:multiplex-${direction}-connection`))

        // Multiplex the connection
        muxerFactory = await (direction === 'inbound'
          ? this._multiplexInbound(stream, this.streamMuxers, opts)
          : this._multiplexOutbound(stream, this.streamMuxers, opts))
      }
    } catch (err: any) {
      maConn.log.error('failed to upgrade %s connection %s %a - %e', direction, direction === 'inbound' ? 'from' : 'to', maConn.remoteAddr, err)
      throw err
    }

    // create the connection muxer if one is configured
    if (muxerFactory != null) {
      maConn.log('create muxer %s', muxerFactory.protocol)
      muxer = muxerFactory.createStreamMuxer(stream)
    }

    // stream.pause()
    await this.shouldBlockConnection(direction === 'inbound' ? 'denyInboundUpgradedConnection' : 'denyOutboundUpgradedConnection', remotePeer, maConn)

    const conn = this._createConnection({
      id,
      cryptoProtocol,
      direction,
      maConn,
      stream,
      muxer,
      remotePeer,
      limits: opts?.limits,
      closeTimeout: this.connectionCloseTimeout
    })

    conn.log('successfully upgraded connection')

    // stream.resume()

    return conn
  }

  /**
   * A convenience method for generating a new `Connection`
   */
  _createConnection (opts: CreateConnectionOptions): Connection {
    // Create the connection
    const connection = createConnection(this.components, {
      ...opts,
      outboundStreamProtocolNegotiationTimeout: this.outboundStreamProtocolNegotiationTimeout,
      inboundStreamProtocolNegotiationTimeout: this.inboundStreamProtocolNegotiationTimeout
    })

    connection.addEventListener('close', () => {
      this.events.safeDispatchEvent('connection:close', {
        detail: connection
      })
    })

    this.events.safeDispatchEvent('connection:open', {
      detail: connection
    })

    return connection
  }

  /**
   * Attempts to encrypt the incoming `connection` with the provided `cryptos`
   */
  async _encryptInbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<EncryptedConnection> {
    const protocols = Array.from(this.connectionEncrypters.keys())

    try {
      const protocol = await mss.handle(connection, protocols, options)
      const encrypter = this.connectionEncrypters.get(protocol)

      if (encrypter == null) {
        throw new EncryptionFailedError(`no crypto module found for ${protocol}`)
      }

      connection.log('encrypting inbound connection using %s', protocol)

      return {
        ...await encrypter.secureInbound(connection, options),
        protocol
      }
    } catch (err: any) {
      throw new EncryptionFailedError(err.message)
    }
  }

  /**
   * Attempts to encrypt the given `connection` with the provided connection encrypters.
   * The first `ConnectionEncrypter` module to succeed will be used
   */
  async _encryptOutbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<EncryptedConnection> {
    const protocols = Array.from(this.connectionEncrypters.keys())

    try {
      connection.log.trace('selecting encrypter from %s', protocols)

      const protocol = await mss.select(connection, protocols, options)
      const encrypter = this.connectionEncrypters.get(protocol)

      if (encrypter == null) {
        throw new EncryptionFailedError(`no crypto module found for ${protocol}`)
      }

      connection.log('encrypting outbound connection using %s', protocol)

      return {
        ...await encrypter.secureOutbound(connection, options),
        protocol
      }
    } catch (err: any) {
      throw new EncryptionFailedError(err.message)
    }
  }

  /**
   * Selects one of the given muxers via multistream-select. That
   * muxer will be used for all future streams on the connection.
   */
  async _multiplexOutbound (maConn: MessageStream, muxers: Map<string, StreamMuxerFactory>, options: AbortOptions): Promise<StreamMuxerFactory> {
    const protocols = Array.from(muxers.keys())
    maConn.log('outbound selecting muxer %s', protocols)

    try {
      maConn.log.trace('selecting stream muxer from %s', protocols)
      const protocol = await mss.select(maConn, protocols, options)
      const muxerFactory = muxers.get(protocol)

      if (muxerFactory == null) {
        throw new MuxerUnavailableError(`No muxer configured for protocol "${protocol}"`)
      }

      maConn.log('selected %s as muxer protocol', protocol)
      return muxerFactory
    } catch (err: any) {
      maConn.log.error('error multiplexing outbound connection - %e', err)
      throw new MuxerUnavailableError(String(err))
    }
  }

  /**
   * Registers support for one of the given muxers via multistream-select. The
   * selected muxer will be used for all future streams on the connection.
   */
  async _multiplexInbound (maConn: MessageStream, muxers: Map<string, StreamMuxerFactory>, options: AbortOptions): Promise<StreamMuxerFactory> {
    const protocols = Array.from(muxers.keys())
    maConn.log('inbound handling muxers %s', protocols)
    try {
      maConn.log.trace('selecting stream muxer from %s', protocols)
      const protocol = await mss.handle(maConn, protocols, options)
      const muxerFactory = muxers.get(protocol)

      if (muxerFactory == null) {
        throw new MuxerUnavailableError(`No muxer configured for protocol "${protocol}"`)
      }

      maConn.log('selected %s as muxer protocol', protocol)
      return muxerFactory
    } catch (err: any) {
      maConn.log.error('error multiplexing inbound connection - %e', err)
      throw err
    }
  }

  getConnectionEncrypters (): Map<string, ConnectionEncrypter<unknown>> {
    return this.connectionEncrypters
  }

  getStreamMuxers (): Map<string, StreamMuxerFactory> {
    return this.streamMuxers
  }
}

function isEncryptionSkipped (opts?: any): opts is UpgraderWithoutEncryptionOptions {
  return opts.skipEncryption === true
}
