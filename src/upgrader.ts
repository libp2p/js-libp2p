import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import * as mss from '@libp2p/multistream-select'
import { codes } from './errors.js'
import { createConnection } from './connection/index.js'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { peerIdFromString } from '@libp2p/peer-id'
import type { MultiaddrConnection, Connection, Stream, ConnectionGater, ConnectionProtector } from '@libp2p/interface-connection'
import type { ConnectionEncrypter, SecuredConnection } from '@libp2p/interface-connection-encrypter'
import type { StreamMuxer, StreamMuxerFactory } from '@libp2p/interface-stream-muxer'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Upgrader, UpgraderEvents, UpgraderOptions } from '@libp2p/interface-transport'
import type { Duplex } from 'it-stream-types'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Registrar } from '@libp2p/interface-registrar'
import { DEFAULT_MAX_INBOUND_STREAMS, DEFAULT_MAX_OUTBOUND_STREAMS } from './registrar.js'
import { TimeoutController } from 'timeout-abort-controller'
import { abortableDuplex } from 'abortable-iterator'
import { setMaxListeners } from 'events'
import type { Metrics } from '@libp2p/interface-metrics'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:upgrader')

interface CreateConectionOptions {
  cryptoProtocol: string
  direction: 'inbound' | 'outbound'
  maConn: MultiaddrConnection
  upgradedConn: Duplex<Uint8Array>
  remotePeer: PeerId
  muxerFactory?: StreamMuxerFactory
}

interface OnStreamOptions {
  connection: Connection
  stream: Stream
  protocol: string
}

export interface CryptoResult extends SecuredConnection {
  protocol: string
}

export interface UpgraderInit {
  connectionEncryption: ConnectionEncrypter[]
  muxers: StreamMuxerFactory[]

  /**
   * An amount of ms by which an inbound connection upgrade
   * must complete
   */
  inboundUpgradeTimeout: number
}

function findIncomingStreamLimit (protocol: string, registrar: Registrar) {
  try {
    const { options } = registrar.getHandler(protocol)

    return options.maxInboundStreams
  } catch (err: any) {
    if (err.code !== codes.ERR_NO_HANDLER_FOR_PROTOCOL) {
      throw err
    }
  }

  return DEFAULT_MAX_INBOUND_STREAMS
}

function findOutgoingStreamLimit (protocol: string, registrar: Registrar) {
  try {
    const { options } = registrar.getHandler(protocol)

    return options.maxOutboundStreams
  } catch (err: any) {
    if (err.code !== codes.ERR_NO_HANDLER_FOR_PROTOCOL) {
      throw err
    }
  }

  return DEFAULT_MAX_OUTBOUND_STREAMS
}

function countStreams (protocol: string, direction: 'inbound' | 'outbound', connection: Connection) {
  let streamCount = 0

  connection.streams.forEach(stream => {
    if (stream.stat.direction === direction && stream.stat.protocol === protocol) {
      streamCount++
    }
  })

  return streamCount
}

export interface DefaultUpgraderComponents {
  peerId: PeerId
  metrics?: Metrics
  connectionManager: ConnectionManager
  connectionGater: ConnectionGater
  connectionProtector?: ConnectionProtector
  registrar: Registrar
  peerStore: PeerStore
}

export class DefaultUpgrader extends EventEmitter<UpgraderEvents> implements Upgrader {
  private readonly components: DefaultUpgraderComponents
  private readonly connectionEncryption: Map<string, ConnectionEncrypter>
  private readonly muxers: Map<string, StreamMuxerFactory>
  private readonly inboundUpgradeTimeout: number

  constructor (components: DefaultUpgraderComponents, init: UpgraderInit) {
    super()

    this.components = components
    this.connectionEncryption = new Map()

    init.connectionEncryption.forEach(encrypter => {
      this.connectionEncryption.set(encrypter.protocol, encrypter)
    })

    this.muxers = new Map()

    init.muxers.forEach(muxer => {
      this.muxers.set(muxer.protocol, muxer)
    })

    this.inboundUpgradeTimeout = init.inboundUpgradeTimeout
  }

  /**
   * Upgrades an inbound connection
   */
  async upgradeInbound (maConn: MultiaddrConnection, opts?: UpgraderOptions): Promise<Connection> {
    const accept = await this.components.connectionManager.acceptIncomingConnection(maConn)

    if (!accept) {
      throw errCode(new Error('connection denied'), codes.ERR_CONNECTION_DENIED)
    }

    let encryptedConn
    let remotePeer
    let upgradedConn: Duplex<Uint8Array>
    let muxerFactory: StreamMuxerFactory | undefined
    let cryptoProtocol

    const timeoutController = new TimeoutController(this.inboundUpgradeTimeout)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, timeoutController.signal)
    } catch {}

    try {
      const abortableStream = abortableDuplex(maConn, timeoutController.signal)
      maConn.source = abortableStream.source
      maConn.sink = abortableStream.sink

      if (await this.components.connectionGater.denyInboundConnection(maConn)) {
        throw errCode(new Error('The multiaddr connection is blocked by gater.acceptConnection'), codes.ERR_CONNECTION_INTERCEPTED)
      }

      this.components.metrics?.trackMultiaddrConnection(maConn)

      log('starting the inbound connection upgrade')

      // Protect
      let protectedConn = maConn

      if (opts?.skipProtection !== true) {
        const protector = this.components.connectionProtector

        if (protector != null) {
          log('protecting the inbound connection')
          protectedConn = await protector.protect(maConn)
        }
      }

      try {
        // Encrypt the connection
        encryptedConn = protectedConn
        if (opts?.skipEncryption !== true) {
          ({
            conn: encryptedConn,
            remotePeer,
            protocol: cryptoProtocol
          } = await this._encryptInbound(protectedConn))

          if (await this.components.connectionGater.denyInboundEncryptedConnection(remotePeer, {
            ...protectedConn,
            ...encryptedConn
          })) {
            throw errCode(new Error('The multiaddr connection is blocked by gater.acceptEncryptedConnection'), codes.ERR_CONNECTION_INTERCEPTED)
          }
        } else {
          const idStr = maConn.remoteAddr.getPeerId()

          if (idStr == null) {
            throw errCode(new Error('inbound connection that skipped encryption must have a peer id'), codes.ERR_INVALID_MULTIADDR)
          }

          const remotePeerId = peerIdFromString(idStr)

          cryptoProtocol = 'native'
          remotePeer = remotePeerId
        }

        upgradedConn = encryptedConn
        if (opts?.muxerFactory != null) {
          muxerFactory = opts.muxerFactory
        } else if (this.muxers.size > 0) {
          // Multiplex the connection
          const multiplexed = await this._multiplexInbound({
            ...protectedConn,
            ...encryptedConn
          }, this.muxers)
          muxerFactory = multiplexed.muxerFactory
          upgradedConn = multiplexed.stream
        }
      } catch (err: any) {
        log.error('Failed to upgrade inbound connection', err)
        throw err
      }

      if (await this.components.connectionGater.denyInboundUpgradedConnection(remotePeer, {
        ...protectedConn,
        ...encryptedConn
      })) {
        throw errCode(new Error('The multiaddr connection is blocked by gater.acceptEncryptedConnection'), codes.ERR_CONNECTION_INTERCEPTED)
      }

      log('Successfully upgraded inbound connection')

      return this._createConnection({
        cryptoProtocol,
        direction: 'inbound',
        maConn,
        upgradedConn,
        muxerFactory,
        remotePeer
      })
    } finally {
      this.components.connectionManager.afterUpgradeInbound()
      timeoutController.clear()
    }
  }

  /**
   * Upgrades an outbound connection
   */
  async upgradeOutbound (maConn: MultiaddrConnection, opts?: UpgraderOptions): Promise<Connection> {
    const idStr = maConn.remoteAddr.getPeerId()
    let remotePeerId: PeerId | undefined

    if (idStr != null) {
      remotePeerId = peerIdFromString(idStr)

      if (await this.components.connectionGater.denyOutboundConnection(remotePeerId, maConn)) {
        throw errCode(new Error('The multiaddr connection is blocked by connectionGater.denyOutboundConnection'), codes.ERR_CONNECTION_INTERCEPTED)
      }
    }

    let encryptedConn
    let remotePeer: PeerId
    let upgradedConn
    let cryptoProtocol
    let muxerFactory

    this.components.metrics?.trackMultiaddrConnection(maConn)

    log('Starting the outbound connection upgrade')

    // If the transport natively supports encryption, skip connection
    // protector and encryption

    // Protect
    let protectedConn = maConn
    if (opts?.skipProtection !== true) {
      const protector = this.components.connectionProtector

      if (protector != null) {
        protectedConn = await protector.protect(maConn)
      }
    }

    try {
      // Encrypt the connection
      encryptedConn = protectedConn
      if (opts?.skipEncryption !== true) {
        ({
          conn: encryptedConn,
          remotePeer,
          protocol: cryptoProtocol
        } = await this._encryptOutbound(protectedConn, remotePeerId))

        if (await this.components.connectionGater.denyOutboundEncryptedConnection(remotePeer, {
          ...protectedConn,
          ...encryptedConn
        })) {
          throw errCode(new Error('The multiaddr connection is blocked by gater.acceptEncryptedConnection'), codes.ERR_CONNECTION_INTERCEPTED)
        }
      } else {
        if (remotePeerId == null) {
          throw errCode(new Error('Encryption was skipped but no peer id was passed'), codes.ERR_INVALID_PEER)
        }

        cryptoProtocol = 'native'
        remotePeer = remotePeerId
      }

      upgradedConn = encryptedConn
      if (opts?.muxerFactory != null) {
        muxerFactory = opts.muxerFactory
      } else if (this.muxers.size > 0) {
        // Multiplex the connection
        const multiplexed = await this._multiplexOutbound({
          ...protectedConn,
          ...encryptedConn
        }, this.muxers)
        muxerFactory = multiplexed.muxerFactory
        upgradedConn = multiplexed.stream
      }
    } catch (err: any) {
      log.error('Failed to upgrade outbound connection', err)
      await maConn.close(err)
      throw err
    }

    if (await this.components.connectionGater.denyOutboundUpgradedConnection(remotePeer, {
      ...protectedConn,
      ...encryptedConn
    })) {
      throw errCode(new Error('The multiaddr connection is blocked by gater.acceptEncryptedConnection'), codes.ERR_CONNECTION_INTERCEPTED)
    }

    log('Successfully upgraded outbound connection')

    return this._createConnection({
      cryptoProtocol,
      direction: 'outbound',
      maConn,
      upgradedConn,
      muxerFactory,
      remotePeer
    })
  }

  /**
   * A convenience method for generating a new `Connection`
   */
  _createConnection (opts: CreateConectionOptions): Connection {
    const {
      cryptoProtocol,
      direction,
      maConn,
      upgradedConn,
      remotePeer,
      muxerFactory
    } = opts

    let muxer: StreamMuxer | undefined
    let newStream: ((multicodecs: string[], options?: AbortOptions) => Promise<Stream>) | undefined
    let connection: Connection // eslint-disable-line prefer-const

    if (muxerFactory != null) {
      // Create the muxer
      muxer = muxerFactory.createStreamMuxer({
        direction,
        // Run anytime a remote stream is created
        onIncomingStream: muxedStream => {
          if (connection == null) {
            return
          }

          void Promise.resolve()
            .then(async () => {
              const protocols = this.components.registrar.getProtocols()
              const { stream, protocol } = await mss.handle(muxedStream, protocols)
              log('%s: incoming stream opened on %s', direction, protocol)

              if (connection == null) {
                return
              }

              const incomingLimit = findIncomingStreamLimit(protocol, this.components.registrar)
              const streamCount = countStreams(protocol, 'inbound', connection)

              if (streamCount === incomingLimit) {
                muxedStream.abort(errCode(new Error(`Too many inbound protocol streams for protocol "${protocol}" - limit ${incomingLimit}`), codes.ERR_TOO_MANY_INBOUND_PROTOCOL_STREAMS))

                return
              }

              // after the handshake the returned stream can have early data so override
              // the souce/sink
              muxedStream.source = stream.source
              muxedStream.sink = stream.sink
              muxedStream.stat.protocol = protocol

              // If a protocol stream has been successfully negotiated and is to be passed to the application,
              // the peerstore should ensure that the peer is registered with that protocol
              this.components.peerStore.protoBook.add(remotePeer, [protocol]).catch(err => log.error(err))

              connection.addStream(muxedStream)
              this.components.metrics?.trackProtocolStream(muxedStream, connection)

              this._onStream({ connection, stream: muxedStream, protocol })
            })
            .catch(err => {
              log.error(err)

              if (muxedStream.stat.timeline.close == null) {
                muxedStream.close()
              }
            })
        },
        // Run anytime a stream closes
        onStreamEnd: muxedStream => {
          connection?.removeStream(muxedStream.id)
        }
      })

      newStream = async (protocols: string[], options: AbortOptions = {}): Promise<Stream> => {
        if (muxer == null) {
          throw errCode(new Error('Stream is not multiplexed'), codes.ERR_MUXER_UNAVAILABLE)
        }

        log('%s: starting new stream on %s', direction, protocols)
        const muxedStream = await muxer.newStream()
        let controller: TimeoutController | undefined

        try {
          if (options.signal == null) {
            log('No abort signal was passed while trying to negotiate protocols %s falling back to default timeout', protocols)

            controller = new TimeoutController(30000)
            options.signal = controller.signal

            try {
              // fails on node < 15.4
              setMaxListeners?.(Infinity, controller.signal)
            } catch {}
          }

          const { stream, protocol } = await mss.select(muxedStream, protocols, options)

          const outgoingLimit = findOutgoingStreamLimit(protocol, this.components.registrar)
          const streamCount = countStreams(protocol, 'outbound', connection)

          if (streamCount === outgoingLimit) {
            const err = errCode(new Error(`Too many outbound protocol streams for protocol "${protocol}" - limit ${outgoingLimit}`), codes.ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS)
            muxedStream.abort(err)

            throw err
          }

          // If a protocol stream has been successfully negotiated and is to be passed to the application,
          // the peerstore should ensure that the peer is registered with that protocol
          this.components.peerStore.protoBook.add(remotePeer, [protocol]).catch(err => log.error(err))

          // after the handshake the returned stream can have early data so override
          // the souce/sink
          muxedStream.source = stream.source
          muxedStream.sink = stream.sink
          muxedStream.stat.protocol = protocol

          this.components.metrics?.trackProtocolStream(muxedStream, connection)

          return muxedStream
        } catch (err: any) {
          log.error('could not create new stream', err)

          if (muxedStream.stat.timeline.close == null) {
            muxedStream.close()
          }

          if (err.code != null) {
            throw err
          }

          throw errCode(err, codes.ERR_UNSUPPORTED_PROTOCOL)
        } finally {
          if (controller != null) {
            controller.clear()
          }
        }
      }

      // Pipe all data through the muxer
      void Promise.all([
        muxer.sink(upgradedConn.source),
        upgradedConn.sink(muxer.source)
      ]).catch(err => {
        log.error(err)
      })
    }

    const _timeline = maConn.timeline
    maConn.timeline = new Proxy(_timeline, {
      set: (...args) => {
        if (connection != null && args[1] === 'close' && args[2] != null && _timeline.close == null) {
          // Wait for close to finish before notifying of the closure
          (async () => {
            try {
              if (connection.stat.status === 'OPEN') {
                await connection.close()
              }
            } catch (err: any) {
              log.error(err)
            } finally {
              this.dispatchEvent(new CustomEvent<Connection>('connectionEnd', {
                detail: connection
              }))
            }
          })().catch(err => {
            log.error(err)
          })
        }

        return Reflect.set(...args)
      }
    })
    maConn.timeline.upgraded = Date.now()

    const errConnectionNotMultiplexed = () => {
      throw errCode(new Error('connection is not multiplexed'), codes.ERR_CONNECTION_NOT_MULTIPLEXED)
    }

    // Create the connection
    connection = createConnection({
      remoteAddr: maConn.remoteAddr,
      remotePeer: remotePeer,
      stat: {
        status: 'OPEN',
        direction,
        timeline: maConn.timeline,
        multiplexer: muxer?.protocol,
        encryption: cryptoProtocol
      },
      newStream: newStream ?? errConnectionNotMultiplexed,
      getStreams: () => muxer != null ? muxer.streams : errConnectionNotMultiplexed(),
      close: async () => {
        await maConn.close()
        // Ensure remaining streams are closed
        if (muxer != null) {
          muxer.close()
        }
      }
    })

    this.dispatchEvent(new CustomEvent<Connection>('connection', {
      detail: connection
    }))

    return connection
  }

  /**
   * Routes incoming streams to the correct handler
   */
  _onStream (opts: OnStreamOptions): void {
    const { connection, stream, protocol } = opts
    const { handler } = this.components.registrar.getHandler(protocol)

    handler({ connection, stream })
  }

  /**
   * Attempts to encrypt the incoming `connection` with the provided `cryptos`
   */
  async _encryptInbound (connection: Duplex<Uint8Array>): Promise<CryptoResult> {
    const protocols = Array.from(this.connectionEncryption.keys())
    log('handling inbound crypto protocol selection', protocols)

    try {
      const { stream, protocol } = await mss.handle(connection, protocols, {
        writeBytes: true
      })
      const encrypter = this.connectionEncryption.get(protocol)

      if (encrypter == null) {
        throw new Error(`no crypto module found for ${protocol}`)
      }

      log('encrypting inbound connection...')

      return {
        ...await encrypter.secureInbound(this.components.peerId, stream),
        protocol
      }
    } catch (err: any) {
      throw errCode(err, codes.ERR_ENCRYPTION_FAILED)
    }
  }

  /**
   * Attempts to encrypt the given `connection` with the provided connection encrypters.
   * The first `ConnectionEncrypter` module to succeed will be used
   */
  async _encryptOutbound (connection: MultiaddrConnection, remotePeerId?: PeerId): Promise<CryptoResult> {
    const protocols = Array.from(this.connectionEncryption.keys())
    log('selecting outbound crypto protocol', protocols)

    try {
      const { stream, protocol } = await mss.select(connection, protocols, {
        writeBytes: true
      })
      const encrypter = this.connectionEncryption.get(protocol)

      if (encrypter == null) {
        throw new Error(`no crypto module found for ${protocol}`)
      }

      log('encrypting outbound connection to %p', remotePeerId)

      return {
        ...await encrypter.secureOutbound(this.components.peerId, stream, remotePeerId),
        protocol
      }
    } catch (err: any) {
      throw errCode(err, codes.ERR_ENCRYPTION_FAILED)
    }
  }

  /**
   * Selects one of the given muxers via multistream-select. That
   * muxer will be used for all future streams on the connection.
   */
  async _multiplexOutbound (connection: MultiaddrConnection, muxers: Map<string, StreamMuxerFactory>): Promise<{stream: Duplex<Uint8Array>, muxerFactory?: StreamMuxerFactory}> {
    const protocols = Array.from(muxers.keys())
    log('outbound selecting muxer %s', protocols)
    try {
      const { stream, protocol } = await mss.select(connection, protocols, {
        writeBytes: true
      })
      log('%s selected as muxer protocol', protocol)
      const muxerFactory = muxers.get(protocol)
      return { stream, muxerFactory }
    } catch (err: any) {
      log.error('error multiplexing outbound stream', err)
      throw errCode(err, codes.ERR_MUXER_UNAVAILABLE)
    }
  }

  /**
   * Registers support for one of the given muxers via multistream-select. The
   * selected muxer will be used for all future streams on the connection.
   */
  async _multiplexInbound (connection: MultiaddrConnection, muxers: Map<string, StreamMuxerFactory>): Promise<{stream: Duplex<Uint8Array>, muxerFactory?: StreamMuxerFactory}> {
    const protocols = Array.from(muxers.keys())
    log('inbound handling muxers %s', protocols)
    try {
      const { stream, protocol } = await mss.handle(connection, protocols, {
        writeBytes: true
      })
      const muxerFactory = muxers.get(protocol)
      return { stream, muxerFactory }
    } catch (err: any) {
      log.error('error multiplexing inbound stream', err)
      throw errCode(err, codes.ERR_MUXER_UNAVAILABLE)
    }
  }
}
