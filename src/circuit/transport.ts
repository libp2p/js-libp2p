import * as CircuitV2 from './v2/pb/index.js'
import { ReservationStore } from './v2/reservation-store.js'
import { logger } from '@libp2p/logger'
import createError from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC } from './multicodec.js'
import { createListener } from './listener.js'
import { symbol, TransportManager, Upgrader } from '@libp2p/interface-transport'
import { peerIdFromString } from '@libp2p/peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Listener, Transport, CreateListenerOptions, ConnectionHandler } from '@libp2p/interface-transport'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { RelayConfig } from './index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import * as CircuitV2Handler from './v2/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Startable } from '@libp2p/interfaces/dist/src/startable'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { pbStream } from 'it-pb-stream'
import pDefer from 'p-defer'

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
      void this.components.registrar.handle(RELAY_V2_HOP_CODEC, (data) => {
        void this.onHop(data).catch(err => {
          log.error(err)
        })
      })
        .catch(err => {
          log.error(err)
        })
    }

    void this.components.registrar.handle(RELAY_V2_STOP_CODEC, (data) => {
      void this.onStop(data).catch(err => {
        log.error(err)
      })
    })
      .catch(err => {
        log.error(err)
      })

    if (this._init.hop.enabled === true) {
      void this.reservationStore.start()
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
    log('received circuit v2 hop protocol stream from %s', connection.remotePeer)

    const hopTimeoutPromise = pDefer()
    const timeout = setTimeout(() => {
      hopTimeoutPromise.reject('timed out')
    }, this._init.hop.timeout)
    const pbstr = pbStream(stream)

    try {
      const request: CircuitV2.HopMessage = await Promise.race([
        pbstr.pb(CircuitV2.HopMessage).read(),
        hopTimeoutPromise.promise as any
      ])

      if (request?.type == null) {
        throw new Error('request was invalid, could not read from stream')
      }

      await Promise.race([
        CircuitV2Handler.handleHopProtocol({
          connection,
          stream: pbstr,
          connectionManager: this.components.connectionManager,
          relayPeer: this.components.peerId,
          relayAddrs: this.components.addressManager.getListenAddrs(),
          reservationStore: this.reservationStore,
          peerStore: this.components.peerStore,
          request
        }),
        hopTimeoutPromise.promise
      ])
    } catch (_err) {
      pbstr.pb(CircuitV2.HopMessage).write({
        type: CircuitV2.HopMessage.Type.STATUS,
        status: CircuitV2.Status.MALFORMED_MESSAGE
      })
      stream.abort(_err as Error)
    } finally {
      clearTimeout(timeout)
    }
  }

  async onStop ({ connection, stream }: IncomingStreamData) {
    const pbstr = pbStream(stream)
    const request = await pbstr.readPB(CircuitV2.StopMessage)
    log('received circuit v2 stop protocol request from %s', connection.remotePeer)
    if (request?.type === undefined) {
      return
    }

    const mStream = await CircuitV2Handler.handleStop({
      connection,
      pbstr,
      request
    })

    if (mStream != null) {
      const remoteAddr = multiaddr(request.peer?.addrs?.[0])
      const localAddr = this.components.transportManager.getAddrs()[0]
      const maConn = streamToMaConnection({
        stream: mStream as any,
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
      const stream = await relayConnection.newStream([RELAY_V2_HOP_CODEC])
      return await this.connectV2({
        stream,
        connection: relayConnection,
        destinationPeer,
        destinationAddr,
        relayAddr,
        ma,
        disconnectOnFailure
      })
    } catch (err: any) {
      log.error('Circuit relay dial failed', err)
      disconnectOnFailure && await relayConnection.close()
      throw err
    }
  }

  async connectV2 (
    {
      stream, connection, destinationPeer,
      destinationAddr, relayAddr, ma,
      disconnectOnFailure
    }: ConnectOptions
  ) {
    try {
      const pbstr = pbStream(stream)
      const hopstr = pbstr.pb(CircuitV2.HopMessage)
      hopstr.write({
        type: CircuitV2.HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [multiaddr(destinationAddr).bytes]
        }
      })

      const status = await hopstr.read()
      if (status.status !== CircuitV2.Status.OK) {
        throw createError(new Error(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`), codes.ERR_HOP_REQUEST_FAILED)
      }

      // TODO: do something with limit and transient connection

      let localAddr = relayAddr
      localAddr = localAddr.encapsulate(`/p2p-circuit/p2p/${this.components.peerId.toString()}`)
      const maConn = streamToMaConnection({
        stream: pbstr.unwrap(),
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
