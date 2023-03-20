import { StopMessage, HopMessage, Status } from '../pb/index.js'
import { logger } from '@libp2p/logger'
import createError from 'err-code'
import * as mafmt from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { codes } from '../../errors.js'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import { createListener } from './listener.js'
import { symbol, Upgrader } from '@libp2p/interface-transport'
import { peerIdFromBytes, peerIdFromString } from '@libp2p/peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Listener, Transport, CreateListenerOptions } from '@libp2p/interface-transport'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { AddressManager } from '@libp2p/interface-address-manager'
import { pbStream } from 'it-pb-stream'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import { CIRCUIT_PROTO_CODE, RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC } from '../constants.js'
import { RelayStoreInit, ReservationStore } from './reservation-store.js'
import { RelayDiscovery, RelayDiscoveryComponents } from './discovery.js'

const log = logger('libp2p:circuit-relay:transport')

const isValidStop = (request: StopMessage): request is Required<StopMessage> => {
  if (request.peer == null) {
    return false
  }

  try {
    request.peer.addrs.forEach(multiaddr)
  } catch {
    return false
  }

  return true
}

export interface CircuitRelayTransportComponents extends RelayDiscoveryComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  upgrader: Upgrader
  addressManager: AddressManager
  contentRouting: ContentRouting
  connectionGater: ConnectionGater
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

/**
 * RelayConfig configures the circuit v2 relay transport.
 */
export interface CircuitRelayTransportInit extends RelayStoreInit {
  /**
   * The number of peers running diable relays to search for and
   * connect to. (default: 0)
   */
  discoverRelays?: number
}

class CircuitRelayTransport implements Transport {
  private readonly discovery?: RelayDiscovery
  private readonly registrar: Registrar
  private readonly peerStore: PeerStore
  private readonly connectionManager: ConnectionManager
  private readonly peerId: PeerId
  private readonly upgrader: Upgrader
  private readonly addressManager: AddressManager
  private readonly connectionGater: ConnectionGater
  private readonly reservationStore: ReservationStore
  private started: boolean

  constructor (components: CircuitRelayTransportComponents, init: CircuitRelayTransportInit) {
    this.registrar = components.registrar
    this.peerStore = components.peerStore
    this.connectionManager = components.connectionManager
    this.peerId = components.peerId
    this.upgrader = components.upgrader
    this.addressManager = components.addressManager
    this.connectionGater = components.connectionGater

    if (init.discoverRelays != null && init.discoverRelays > 0) {
      this.discovery = new RelayDiscovery(components)
      this.discovery.addEventListener('relay:discover', (evt) => {
        this.reservationStore.addRelay(evt.detail, 'discovered')
          .catch(err => {
            log.error('could not add discovered relay %p', evt.detail, err)
          })
      })
    }

    this.reservationStore = new ReservationStore(components, init)
    this.reservationStore.addEventListener('relay:not-enough-relays', () => {
      this.discovery?.discover()
        .catch(err => {
          log.error('could not discover relays', err)
        })
    })

    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    await this.reservationStore.start()
    await this.discovery?.start()

    await this.registrar.handle(RELAY_V2_STOP_CODEC, (data) => {
      void this.onStop(data).catch(err => {
        log.error(err)
      })
    })

    this.started = true
  }

  async stop (): Promise<void> {
    this.discovery?.stop()
    await this.reservationStore.stop()
    await this.registrar.unhandle(RELAY_V2_STOP_CODEC)

    this.started = false
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] (): 'libp2p/circuit-relay-v2' {
    return 'libp2p/circuit-relay-v2'
  }

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    if (ma.protoCodes().filter(code => code === CIRCUIT_PROTO_CODE).length !== 1) {
      const errMsg = 'Invalid circuit relay address'
      log.error(errMsg, ma)
      throw createError(new Error(errMsg), codes.ERR_RELAYED_DIAL)
    }

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
    const relayConnections = this.connectionManager.getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.peerStore.addressBook.add(relayPeer, [relayAddr])
      relayConnection = await this.connectionManager.openConnection(relayPeer, options)
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
  ): Promise<Connection> {
    try {
      const pbstr = pbStream(stream)
      const hopstr = pbstr.pb(HopMessage)
      hopstr.write({
        type: HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [multiaddr(destinationAddr).bytes]
        }
      })

      const status = await hopstr.read()

      if (status.status !== Status.OK) {
        throw createError(new Error(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`), codes.ERR_HOP_REQUEST_FAILED)
      }

      // TODO: do something with limit and transient connection

      const maConn = streamToMaConnection({
        stream: pbstr.unwrap(),
        remoteAddr: ma,
        localAddr: relayAddr.encapsulate(`/p2p-circuit/p2p/${this.peerId.toString()}`)
      })

      log('new outbound connection %s', maConn.remoteAddr)
      return await this.upgrader.upgradeOutbound(maConn)
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
    return createListener({
      connectionManager: this.connectionManager,
      relayStore: this.reservationStore
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

  /**
   * An incoming STOP request means a remote peer wants to dial us via a relay
   */
  async onStop ({ connection, stream }: IncomingStreamData): Promise<void> {
    const pbstr = pbStream(stream)
    const request = await pbstr.readPB(StopMessage)
    log('received circuit v2 stop protocol request from %s', connection.remotePeer)

    if (request?.type === undefined) {
      return
    }

    const stopstr = pbstr.pb(StopMessage)
    log('new circuit relay v2 stop stream from %s', connection.remotePeer)

    // Validate the STOP request has the required input
    if (request.type !== StopMessage.Type.CONNECT) {
      log.error('invalid stop connect request via peer %s', connection.remotePeer)
      stopstr.write({ type: StopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE })
      return
    }

    if (!isValidStop(request)) {
      log.error('invalid stop connect request via peer %s', connection.remotePeer)
      stopstr.write({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE })
      return
    }

    const remotePeerId = peerIdFromBytes(request.peer.id)

    if ((await this.connectionGater.denyInboundRelayedConnection?.(connection.remotePeer, remotePeerId)) === true) {
      stopstr.write({ type: StopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    stopstr.write({ type: StopMessage.Type.STATUS, status: Status.OK })

    const remoteAddr = connection.remoteAddr.encapsulate(`/p2p-circuit/p2p/${remotePeerId.toString()}`)
    const localAddr = this.addressManager.getAddresses()[0]
    const maConn = streamToMaConnection({
      stream: pbstr.unwrap(),
      remoteAddr,
      localAddr
    })

    log('new inbound connection %s', maConn.remoteAddr)
    await this.upgrader.upgradeInbound(maConn)
    log('%s connection %s upgraded', 'inbound', maConn.remoteAddr)
  }
}

export function circuitRelayTransport (init: CircuitRelayTransportInit = {}): (components: CircuitRelayTransportComponents) => Transport {
  return (components) => {
    return new CircuitRelayTransport(components, init)
  }
}
