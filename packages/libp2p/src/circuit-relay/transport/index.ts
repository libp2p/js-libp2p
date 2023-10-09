import { CodeError, codes } from '@libp2p/interface/errors'
import { symbol, type Transport, type CreateListenerOptions, type Listener, type Upgrader } from '@libp2p/interface/transport'
import { logger } from '@libp2p/logger'
import { peerIdFromBytes, peerIdFromString } from '@libp2p/peer-id'
import { streamToMaConnection } from '@libp2p/utils/stream-to-ma-conn'
import * as mafmt from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { MAX_CONNECTIONS } from '../../connection-manager/constants.js'
import { CIRCUIT_PROTO_CODE, RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC } from '../constants.js'
import { StopMessage, HopMessage, Status } from '../pb/index.js'
import { RelayDiscovery, type RelayDiscoveryComponents } from './discovery.js'
import { createListener } from './listener.js'
import { type RelayStoreInit, ReservationStore } from './reservation-store.js'
import type { Libp2pEvents, AbortOptions } from '@libp2p/interface'
import type { Connection, Stream } from '@libp2p/interface/connection'
import type { ConnectionGater } from '@libp2p/interface/connection-gater'
import type { ContentRouting } from '@libp2p/interface/content-routing'
import type { EventEmitter } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

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
  events: EventEmitter<Libp2pEvents>
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

  /**
   * The maximum number of simultaneous STOP inbound streams that can be open at
   * once - each inbound relayed connection uses a STOP stream (default: 300)
   */
  maxInboundStopStreams?: number

  /**
   * The maximum number of simultaneous STOP outbound streams that can be open at
   * once. If this transport is used along with the relay server these settings
   * should be set to the same value (default: 300)
   */
  maxOutboundStopStreams?: number

  /**
   * Incoming STOP requests (e.g. when a remote peer wants to dial us via a relay)
   * must finish the initial protocol negotiation within this timeout in ms
   * (default: 30000)
   */
  stopTimeout?: number

  /**
   * When creating a reservation it must complete within this number of ms
   * (default: 10000)
   */
  reservationCompletionTimeout?: number
}

const defaults = {
  maxInboundStopStreams: MAX_CONNECTIONS,
  maxOutboundStopStreams: MAX_CONNECTIONS,
  stopTimeout: 30000
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
  private readonly maxInboundStopStreams: number
  private readonly maxOutboundStopStreams?: number
  private readonly stopTimeout: number
  private started: boolean

  constructor (components: CircuitRelayTransportComponents, init: CircuitRelayTransportInit) {
    this.registrar = components.registrar
    this.peerStore = components.peerStore
    this.connectionManager = components.connectionManager
    this.peerId = components.peerId
    this.upgrader = components.upgrader
    this.addressManager = components.addressManager
    this.connectionGater = components.connectionGater
    this.maxInboundStopStreams = init.maxInboundStopStreams ?? defaults.maxInboundStopStreams
    this.maxOutboundStopStreams = init.maxOutboundStopStreams ?? defaults.maxOutboundStopStreams
    this.stopTimeout = init.stopTimeout ?? defaults.stopTimeout

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
        log.error('error while handling STOP protocol', err)
        data.stream.abort(err)
      })
    }, {
      maxInboundStreams: this.maxInboundStopStreams,
      maxOutboundStreams: this.maxOutboundStopStreams,
      runOnTransientConnection: true
    })

    this.started = true
  }

  async stop (): Promise<void> {
    this.discovery?.stop()
    await this.reservationStore.stop()
    await this.registrar.unhandle(RELAY_V2_STOP_CODEC)

    this.started = false
  }

  readonly [symbol] = true

  readonly [Symbol.toStringTag] = 'libp2p/circuit-relay-v2'

  /**
   * Dial a peer over a relay
   */
  async dial (ma: Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    if (ma.protoCodes().filter(code => code === CIRCUIT_PROTO_CODE).length !== 1) {
      const errMsg = 'Invalid circuit relay address'
      log.error(errMsg, ma)
      throw new CodeError(errMsg, codes.ERR_RELAYED_DIAL)
    }

    // Check the multiaddr to see if it contains a relay and a destination peer
    const addrs = ma.toString().split('/p2p-circuit')
    const relayAddr = multiaddr(addrs[0])
    const destinationAddr = multiaddr(addrs[addrs.length - 1])
    const relayId = relayAddr.getPeerId()
    const destinationId = destinationAddr.getPeerId()

    if (relayId == null || destinationId == null) {
      const errMsg = `Circuit relay dial to ${ma.toString()} failed as address did not have peer ids`
      log.error(errMsg)
      throw new CodeError(errMsg, codes.ERR_RELAYED_DIAL)
    }

    const relayPeer = peerIdFromString(relayId)
    const destinationPeer = peerIdFromString(destinationId)

    let disconnectOnFailure = false
    const relayConnections = this.connectionManager.getConnections(relayPeer)
    let relayConnection = relayConnections[0]

    if (relayConnection == null) {
      await this.peerStore.merge(relayPeer, {
        multiaddrs: [relayAddr]
      })
      relayConnection = await this.connectionManager.openConnection(relayPeer, options)
      disconnectOnFailure = true
    }

    let stream: Stream | undefined

    try {
      stream = await relayConnection.newStream([RELAY_V2_HOP_CODEC])

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
      log.error('circuit relay dial to destination %p via relay %p failed', destinationPeer, relayPeer, err)

      if (stream != null) {
        stream.abort(err)
      }

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
      await hopstr.write({
        type: HopMessage.Type.CONNECT,
        peer: {
          id: destinationPeer.toBytes(),
          addrs: [multiaddr(destinationAddr).bytes]
        }
      })

      const status = await hopstr.read()

      if (status.status !== Status.OK) {
        throw new CodeError(`failed to connect via relay with status ${status?.status?.toString() ?? 'undefined'}`, codes.ERR_HOP_REQUEST_FAILED)
      }

      const maConn = streamToMaConnection({
        stream: pbstr.unwrap(),
        remoteAddr: ma,
        localAddr: relayAddr.encapsulate(`/p2p-circuit/p2p/${this.peerId.toString()}`)
      })

      log('new outbound transient connection %a', maConn.remoteAddr)
      return await this.upgrader.upgradeOutbound(maConn, {
        transient: true
      })
    } catch (err) {
      log.error(`Circuit relay dial to destination ${destinationPeer.toString()} via relay ${connection.remotePeer.toString()} failed`, err)
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
    const signal = AbortSignal.timeout(this.stopTimeout)
    const pbstr = pbStream(stream).pb(StopMessage)
    const request = await pbstr.read({
      signal
    })

    log('new circuit relay v2 stop stream from %p with type %s', connection.remotePeer, request.type)

    if (request?.type === undefined) {
      log.error('type was missing from circuit v2 stop protocol request from %s', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, {
        signal
      })
      await stream.close()
      return
    }

    // Validate the STOP request has the required input
    if (request.type !== StopMessage.Type.CONNECT) {
      log.error('invalid stop connect request via peer %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE }, {
        signal
      })
      await stream.close()
      return
    }

    if (!isValidStop(request)) {
      log.error('invalid stop connect request via peer %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, {
        signal
      })
      await stream.close()
      return
    }

    const remotePeerId = peerIdFromBytes(request.peer.id)

    if ((await this.connectionGater.denyInboundRelayedConnection?.(connection.remotePeer, remotePeerId)) === true) {
      log.error('connection gater denied inbound relayed connection from %p', connection.remotePeer)
      await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, {
        signal
      })
      await stream.close()
      return
    }

    log.trace('sending success response to %p', connection.remotePeer)
    await pbstr.write({ type: StopMessage.Type.STATUS, status: Status.OK }, {
      signal
    })

    const remoteAddr = connection.remoteAddr.encapsulate(`/p2p-circuit/p2p/${remotePeerId.toString()}`)
    const localAddr = this.addressManager.getAddresses()[0]
    const maConn = streamToMaConnection({
      stream: pbstr.unwrap().unwrap(),
      remoteAddr,
      localAddr
    })

    log('new inbound transient connection %a', maConn.remoteAddr)
    await this.upgrader.upgradeInbound(maConn, {
      transient: true
    })
    log('%s connection %a upgraded', 'inbound', maConn.remoteAddr)
  }
}

export function circuitRelayTransport (init: CircuitRelayTransportInit = {}): (components: CircuitRelayTransportComponents) => Transport {
  return (components) => {
    return new CircuitRelayTransport(components, init)
  }
}
