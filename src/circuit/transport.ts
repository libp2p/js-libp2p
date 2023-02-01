import * as CircuitV1 from './v1/pb/index.js'
import * as CircuitV2 from './v2/pb/index.js'
import { ReservationStore } from './v2/reservation-store.js'
import { logger } from '@libp2p/logger'
import createError from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { RELAY_V2_HOP_CODEC, RELAY_V1_CODEC, RELAY_V2_STOP_CODEC } from './multicodec.js'
import { createListener } from './listener.js'
import { symbol, TransportManager, Upgrader } from '@libp2p/interface-transport'
import { peerIdFromString } from '@libp2p/peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Listener, Transport, CreateListenerOptions, ConnectionHandler } from '@libp2p/interface-transport'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { RelayConfig } from './index.js'
import { abortableDuplex } from 'abortable-iterator'
import { TimeoutController } from 'timeout-abort-controller'
import { setMaxListeners } from 'events'
import type { PeerId } from '@libp2p/interface-peer-id'
import { StreamHandlerV2 } from './v2/stream-handler.js'
import * as CircuitV1Handler from './v1/index.js'
import * as CircuitV2Handler from './v2/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Startable } from '@libp2p/interfaces/dist/src/startable'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { AddressManager } from '@libp2p/interface-address-manager'

const log = logger('libp2p:circuit')

export interface CircuitOptions {
  limit?: number
}

export interface CircuitComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  upgrader: Upgrader
  addressManager: AddressManager
  transportManager: TransportManager
}

interface ConnectOptions {
  stream: Stream
  connection: Connection
  destinationPeer: PeerId
  destinationAddr: Multiaddr
  relayAddr: Multiaddr
  ma: Multiaddr
  disconnectOnFailure: boolean
}

export class Circuit implements Transport, Startable {
  private handler?: ConnectionHandler
  private readonly components: CircuitComponents
  private readonly reservationStore: ReservationStore
  private readonly _init: RelayConfig
  private _started: boolean

  constructor (components: CircuitComponents, options: RelayConfig) {
    this.components = components
    this._init = options
    this.reservationStore = new ReservationStore()
    this._started = false
  }

  isStarted () {
    return this._started
  }

  async start (): Promise<void> {
    if (this._started) {
      return
    }

    this._started = true

    // only handle hop if enabled
    if (this._init.hop.enabled === true) {
      await this.components.registrar.handle(RELAY_V2_HOP_CODEC, (data) => {
        void this.onHop(data).catch(err => {
          log.error(err)
        })
      })
        .catch(err => {
          log.error(err)
        })
    }

    await this.components.registrar.handle(RELAY_V2_STOP_CODEC, (data) => {
      void this.onStop(data).catch(err => {
        log.error(err)
      })
    })
      .catch(err => {
        log.error(err)
      })

    if (this._init.hop.enabled === true) {
      this.reservationStore.start()
    }
  }

  async stop () {
    if (this._init.hop.enabled === true) {
      this.reservationStore.stop()
      await this.components.registrar.unhandle(RELAY_V2_HOP_CODEC)
    }
    await this.components.registrar.unhandle(RELAY_V2_STOP_CODEC)
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return 'libp2p/circuit-relay-v2'
  }

  async onHop ({ connection, stream }: IncomingStreamData) {
    // log('received circuit v2 hop protocol stream from %s', connection.remotePeer)
    const controller = new TimeoutController(this._init.hop.timeout)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, controller.signal)
    } catch { }

    const source = abortableDuplex(stream, controller.signal)
    const streamHandler = new StreamHandlerV2({ stream: { ...stream, ...source } })
    try {
      const request = CircuitV2.HopMessage.decode(await streamHandler.read())

      if (request?.type == null) {
        throw new Error('request was invalid, could not read from stream')
      }

      await CircuitV2Handler.handleHopProtocol({
        connection,
        streamHandler,
        connectionManager: this.components.connectionManager,
        relayPeer: this.components.peerId,
        relayAddrs: this.components.addressManager.getListenAddrs(),
        reservationStore: this.reservationStore,
        request
      })
    } catch (_err) {
      streamHandler.write(CircuitV2.HopMessage.encode({
        type: CircuitV2.HopMessage.Type.STATUS,
        status: CircuitV2.Status.MALFORMED_MESSAGE
      }))
      streamHandler.close()
    } finally {
      controller.clear()
    }
  }

  async onStop ({ connection, stream }: IncomingStreamData) {
    const streamHandler = new StreamHandlerV2({ stream })
    const request = CircuitV2.StopMessage.decode(await streamHandler.read())
    log('received circuit v2 stop protocol request from %s', connection.remotePeer)
    if (request?.type === undefined) {
      return
    }

    const mStream = await CircuitV2Handler.handleStop({
      connection,
      streamHandler,
      request
    })

    if (mStream !== null && mStream !== undefined) {
      const remoteAddr = multiaddr(request.peer?.addrs?.[0])
      const localAddr = this.components.transportManager.getAddrs()[0]
      const maConn = streamToMaConnection({
        stream: mStream,
        remoteAddr,
        localAddr
      })
      log('new inbound connection %s', maConn.remoteAddr)
      const conn = await this.components.upgrader.upgradeInbound(maConn)
      log('%s connection %s upgraded', 'inbound', maConn.remoteAddr)
      this.handler?.(conn)
    }
  }

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = multiaddr(addrs[0])
    const destinationAddr = multiaddr(addrs[addrs.length - 1])
    const relayId = relayAddr.getPeerId()
    const destinationId = destinationAddr.getPeerId()

    if (relayId == null || destinationId == null) {
      const errMsg = 'Circuit relay dial failed as addresses did not have peer id'
      log.error(errMsg)
      throw createError(new Error(errMsg), codes.ERR_RELAYED_DIAL)
    }

    const relayPeer = peerIdFromString(relayId)
    const destinationPeer = peerIdFromString(destinationId)

    let disconnectOnFailure = false
    const relayConnections = this.components.connectionManager.getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.components.peerStore.addressBook.add(relayPeer, [relayAddr])
      relayConnection = await this.components.connectionManager.openConnection(relayPeer, options)
      disconnectOnFailure = true
    }

    try {
      const stream = await relayConnection.newStream([RELAY_V2_HOP_CODEC, RELAY_V1_CODEC])

      switch (stream.stat.protocol) {
        case RELAY_V1_CODEC: return await this.connectV1({
          stream,
          connection: relayConnection,
          destinationPeer,
          destinationAddr,
          relayAddr,
          ma,
          disconnectOnFailure
        })
        case RELAY_V2_HOP_CODEC: return await this.connectV2({
          stream,
          connection: relayConnection,
          destinationPeer,
          destinationAddr,
          relayAddr,
          ma,
          disconnectOnFailure
        })
        default:
          stream.reset()
          throw new Error('Unexpected stream protocol')
      }
    } catch (err: any) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await relayConnection.close()
      throw err
    }
  }

  async connectV1 ({
    stream, destinationPeer,
    destinationAddr, relayAddr, ma
  }: ConnectOptions
  ) {
    const virtualConnection = await CircuitV1Handler.hop({
      stream,
      request: {
        type: CircuitV1.CircuitRelay.Type.HOP,
        srcPeer: {
          id: this.components.peerId.toBytes(),
          addrs: this.components.addressManager.getListenAddrs().map(addr => addr.bytes)
        },
        dstPeer: {
          id: destinationPeer.toBytes(),
          addrs: [multiaddr(destinationAddr).bytes]
        }
      }
    })

    const localAddr = relayAddr.encapsulate(`/p2p-circuit/p2p/${this.components.peerId.toString()}`)
    const maConn = streamToMaConnection({
      stream: virtualConnection,
      remoteAddr: ma,
      localAddr
    })
    log('new outbound connection %s', maConn.remoteAddr)

    return await this.components.upgrader.upgradeOutbound(maConn)
  }

  async connectV2 (
    {
      stream, connection, destinationPeer,
      destinationAddr, relayAddr, ma,
      disconnectOnFailure
    }: ConnectOptions
  ) {
    try {
      const streamHandler = new StreamHandlerV2({ stream })
      streamHandler.write(CircuitV2.HopMessage.encode({
        type: CircuitV2.HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [multiaddr(destinationAddr).bytes]
        }
      }))

      const status = CircuitV2.HopMessage.decode(await streamHandler.read())
      if (status.status !== CircuitV2.Status.OK) {
        throw createError(new Error(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`), codes.ERR_HOP_REQUEST_FAILED)
      }

      // TODO: do something with limit and transient connection

      let localAddr = relayAddr
      localAddr = localAddr.encapsulate(`/p2p-circuit/p2p/${this.components.peerId.toString()}`)
      const maConn = streamToMaConnection({
        stream: streamHandler.rest(),
        remoteAddr: ma,
        localAddr
      })
      log('new outbound connection %s', maConn.remoteAddr)
      const conn = await this.components.upgrader.upgradeOutbound(maConn)
      return conn
    } catch (err) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await connection.close()
      throw err
    }
  }

  /**
   * Create a listener
   */
  createListener (options: CreateListenerOptions): Listener {
    // Called on successful HOP and STOP requests
    this.handler = options.handler

    return createListener({
      connectionManager: this.components.connectionManager,
      peerStore: this.components.peerStore
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial on
   *
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]}
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      return mafmt.Circuit.matches(ma)
    })
  }
}
