import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { pbStream, type ProtobufStream } from 'it-protobuf-stream'
import pDefer from 'p-defer'
import {
  CIRCUIT_PROTO_CODE,
  DEFAULT_HOP_TIMEOUT,
  MAX_CONNECTIONS,
  RELAY_SOURCE_TAG,
  RELAY_V2_HOP_CODEC,
  RELAY_V2_STOP_CODEC
} from '../constants.js'
import { HopMessage, type Reservation, Status, StopMessage } from '../pb/index.js'
import { createLimitedRelay } from '../utils.js'
import { AdvertService, type AdvertServiceComponents, type AdvertServiceInit } from './advert-service.js'
import { ReservationStore, type ReservationStoreInit } from './reservation-store.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import type { CircuitRelayService, RelayReservation } from '../index.js'
import type { ComponentLogger, Logger, Connection, Stream, ConnectionGater, PeerId, PeerStore, Startable } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, IncomingStreamData, Registrar } from '@libp2p/interface-internal'
import type { PeerMap } from '@libp2p/peer-collections'

const isRelayAddr = (ma: Multiaddr): boolean => ma.protoCodes().includes(CIRCUIT_PROTO_CODE)

export interface CircuitRelayServerInit {
  /**
   * Incoming hop requests must complete within this time in ms otherwise
   * the stream will be reset (default: 30s)
   */
  hopTimeout?: number

  /**
   * If true, advertise this service via libp2p content routing to allow
   * peers to locate us on the network (default: false)
   */
  advertise?: boolean | AdvertServiceInit

  /**
   * Configuration of reservations
   */
  reservations?: ReservationStoreInit

  /**
   * The maximum number of simultaneous HOP inbound streams that can be open at once
   */
  maxInboundHopStreams?: number

  /**
   * The maximum number of simultaneous HOP outbound streams that can be open at once
   */
  maxOutboundHopStreams?: number

  /**
   * The maximum number of simultaneous STOP outbound streams that can be open at
   * once. (default: 300)
   */
  maxOutboundStopStreams?: number
}

export interface HopProtocolOptions {
  connection: Connection
  request: HopMessage
  stream: ProtobufStream<Stream>
}

export interface StopOptions {
  connection: Connection
  request: StopMessage
}

export interface CircuitRelayServerComponents extends AdvertServiceComponents {
  registrar: Registrar
  peerStore: PeerStore
  addressManager: AddressManager
  peerId: PeerId
  connectionManager: ConnectionManager
  connectionGater: ConnectionGater
  logger: ComponentLogger
}

export interface RelayServerEvents {
  'relay:reservation': CustomEvent<RelayReservation>
  'relay:advert:success': CustomEvent<unknown>
  'relay:advert:error': CustomEvent<Error>
}

const defaults = {
  maxOutboundStopStreams: MAX_CONNECTIONS
}

class CircuitRelayServer extends TypedEventEmitter<RelayServerEvents> implements Startable, CircuitRelayService {
  private readonly registrar: Registrar
  private readonly peerStore: PeerStore
  private readonly addressManager: AddressManager
  private readonly peerId: PeerId
  private readonly connectionManager: ConnectionManager
  private readonly connectionGater: ConnectionGater
  private readonly reservationStore: ReservationStore
  private readonly advertService: AdvertService | undefined
  private started: boolean
  private readonly hopTimeout: number
  private readonly shutdownController: AbortController
  private readonly maxInboundHopStreams?: number
  private readonly maxOutboundHopStreams?: number
  private readonly maxOutboundStopStreams: number
  private readonly log: Logger

  /**
   * Creates an instance of Relay
   */
  constructor (components: CircuitRelayServerComponents, init: CircuitRelayServerInit = {}) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:server')
    this.registrar = components.registrar
    this.peerStore = components.peerStore
    this.addressManager = components.addressManager
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.connectionGater = components.connectionGater
    this.started = false
    this.hopTimeout = init?.hopTimeout ?? DEFAULT_HOP_TIMEOUT
    this.shutdownController = new AbortController()
    this.maxInboundHopStreams = init.maxInboundHopStreams
    this.maxOutboundHopStreams = init.maxOutboundHopStreams
    this.maxOutboundStopStreams = init.maxOutboundStopStreams ?? defaults.maxOutboundStopStreams

    setMaxListeners(Infinity, this.shutdownController.signal)

    if (init.advertise != null && init.advertise !== false) {
      this.advertService = new AdvertService(components, init.advertise === true ? undefined : init.advertise)
      this.advertService.addEventListener('advert:success', () => {
        this.safeDispatchEvent('relay:advert:success', {})
      })
      this.advertService.addEventListener('advert:error', (evt) => {
        this.safeDispatchEvent('relay:advert:error', { detail: evt.detail })
      })
    }

    this.reservationStore = new ReservationStore(init.reservations)
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * Start Relay service
   */
  async start (): Promise<void> {
    if (this.started) {
      return
    }

    // Advertise service if HOP enabled and advertising enabled
    this.advertService?.start()

    await this.registrar.handle(RELAY_V2_HOP_CODEC, (data) => {
      void this.onHop(data).catch(err => {
        this.log.error(err)
      })
    }, {
      maxInboundStreams: this.maxInboundHopStreams,
      maxOutboundStreams: this.maxOutboundHopStreams,
      runOnTransientConnection: true
    })

    this.reservationStore.start()

    this.started = true
  }

  /**
   * Stop Relay service
   */
  async stop (): Promise<void> {
    this.advertService?.stop()
    this.reservationStore.stop()
    this.shutdownController.abort()
    await this.registrar.unhandle(RELAY_V2_HOP_CODEC)

    this.started = false
  }

  async onHop ({ connection, stream }: IncomingStreamData): Promise<void> {
    this.log('received circuit v2 hop protocol stream from %p', connection.remotePeer)

    const hopTimeoutPromise = pDefer<HopMessage>()
    const timeout = setTimeout(() => {
      hopTimeoutPromise.reject('timed out')
    }, this.hopTimeout)
    const pbstr = pbStream(stream)

    try {
      const request: HopMessage = await Promise.race([
        pbstr.pb(HopMessage).read(),
        hopTimeoutPromise.promise
      ])

      if (request?.type == null) {
        throw new Error('request was invalid, could not read from stream')
      }

      this.log('received', request.type)

      await Promise.race([
        this.handleHopProtocol({
          connection,
          stream: pbstr,
          request
        }),
        hopTimeoutPromise.promise
      ])
    } catch (err: any) {
      this.log.error('error while handling hop', err)
      await pbstr.pb(HopMessage).write({
        type: HopMessage.Type.STATUS,
        status: Status.MALFORMED_MESSAGE
      })
      stream.abort(err)
    } finally {
      clearTimeout(timeout)
    }
  }

  async handleHopProtocol ({ stream, request, connection }: HopProtocolOptions): Promise<void> {
    this.log('received hop message')
    switch (request.type) {
      case HopMessage.Type.RESERVE: await this.handleReserve({ stream, request, connection }); break
      case HopMessage.Type.CONNECT: await this.handleConnect({ stream, request, connection }); break
      default: {
        this.log.error('invalid hop request type %s via peer %p', request.type, connection.remotePeer)
        await stream.pb(HopMessage).write({ type: HopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE })
      }
    }
  }

  async handleReserve ({ stream, request, connection }: HopProtocolOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)
    this.log('hop reserve request from %p', connection.remotePeer)

    if (isRelayAddr(connection.remoteAddr)) {
      this.log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    if ((await this.connectionGater.denyInboundRelayReservation?.(connection.remotePeer)) === true) {
      this.log.error('reservation for %p denied by connection gater', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    const result = this.reservationStore.reserve(connection.remotePeer, connection.remoteAddr)

    if (result.status !== Status.OK) {
      await hopstr.write({ type: HopMessage.Type.STATUS, status: result.status })
      return
    }

    try {
      // tag relay target peer
      // result.expire is non-null if `ReservationStore.reserve` returns with status == OK
      if (result.expire != null) {
        const ttl = (result.expire * 1000) - Date.now()
        await this.peerStore.merge(connection.remotePeer, {
          tags: {
            [RELAY_SOURCE_TAG]: { value: 1, ttl }
          }
        })
      }

      await hopstr.write({
        type: HopMessage.Type.STATUS,
        status: Status.OK,
        reservation: await this.makeReservation(connection.remotePeer, BigInt(result.expire ?? 0)),
        limit: this.reservationStore.get(connection.remotePeer)?.limit
      })
      this.log('sent confirmation response to %s', connection.remotePeer)
    } catch (err) {
      this.log.error('failed to send confirmation response to %p', connection.remotePeer, err)
      this.reservationStore.removeReservation(connection.remotePeer)
    }
  }

  async makeReservation (
    remotePeer: PeerId,
    expire: bigint
  ): Promise<Reservation> {
    const addrs = []

    for (const relayAddr of this.addressManager.getAddresses()) {
      if (relayAddr.toString().includes('/p2p-circuit')) {
        continue
      }

      addrs.push(relayAddr.bytes)
    }

    const voucher = await RecordEnvelope.seal(new ReservationVoucherRecord({
      peer: remotePeer,
      relay: this.peerId,
      expiration: Number(expire)
    }), this.peerId)

    return {
      addrs,
      expire,
      voucher: voucher.marshal()
    }
  }

  async handleConnect ({ stream, request, connection }: HopProtocolOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)

    if (isRelayAddr(connection.remoteAddr)) {
      this.log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    this.log('hop connect request from %p', connection.remotePeer)

    let dstPeer: PeerId

    try {
      if (request.peer == null) {
        this.log.error('no peer info in hop connect request')
        throw new Error('no peer info in request')
      }

      request.peer.addrs.forEach(multiaddr)
      dstPeer = peerIdFromBytes(request.peer.id)
    } catch (err) {
      this.log.error('invalid hop connect request via peer %p %s', connection.remotePeer, err)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE })
      return
    }

    if (!this.reservationStore.hasReservation(dstPeer)) {
      this.log.error('hop connect denied for destination peer %p not having a reservation for %p with status %s', dstPeer, connection.remotePeer, Status.NO_RESERVATION)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
      return
    }

    if ((await this.connectionGater.denyOutboundRelayedConnection?.(connection.remotePeer, dstPeer)) === true) {
      this.log.error('hop connect for %p to %p denied by connection gater', connection.remotePeer, dstPeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    const connections = this.connectionManager.getConnections(dstPeer)

    if (connections.length === 0) {
      this.log('hop connect denied for destination peer %p not having a connection for %p as there is no destination connection', dstPeer, connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
      return
    }

    const destinationConnection = connections[0]

    const destinationStream = await this.stopHop({
      connection: destinationConnection,
      request: {
        type: StopMessage.Type.CONNECT,
        peer: {
          id: connection.remotePeer.toBytes(),
          addrs: []
        }
      }
    })

    if (destinationStream == null) {
      this.log.error('failed to open stream to destination peer %p', destinationConnection?.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.CONNECTION_FAILED })
      return
    }

    await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.OK })
    const sourceStream = stream.unwrap()

    this.log('connection from %p to %p established - merging streams', connection.remotePeer, dstPeer)
    const limit = this.reservationStore.get(dstPeer)?.limit
    // Short circuit the two streams to create the relayed connection
    createLimitedRelay(sourceStream, destinationStream, this.shutdownController.signal, limit, {
      log: this.log
    })
  }

  /**
   * Send a STOP request to the target peer that the dialing peer wants to contact
   */
  async stopHop ({
    connection,
    request
  }: StopOptions): Promise<Stream | undefined> {
    this.log('starting circuit relay v2 stop request to %s', connection.remotePeer)
    const stream = await connection.newStream([RELAY_V2_STOP_CODEC], {
      maxOutboundStreams: this.maxOutboundStopStreams,
      runOnTransientConnection: true
    })
    const pbstr = pbStream(stream)
    const stopstr = pbstr.pb(StopMessage)
    await stopstr.write(request)
    let response

    try {
      response = await stopstr.read()
    } catch (err) {
      this.log.error('error parsing stop message response from %p', connection.remotePeer)
    }

    if (response == null) {
      this.log.error('could not read response from %p', connection.remotePeer)
      await stream.close()
      return
    }

    if (response.status === Status.OK) {
      this.log('stop request to %p was successful', connection.remotePeer)
      return pbstr.unwrap()
    }

    this.log('stop request failed with code %d', response.status)
    await stream.close()
  }

  get reservations (): PeerMap<RelayReservation> {
    return this.reservationStore.reservations
  }
}

export function circuitRelayServer (init: CircuitRelayServerInit = {}): (components: CircuitRelayServerComponents) => CircuitRelayService {
  return (components) => {
    return new CircuitRelayServer(components, init)
  }
}
