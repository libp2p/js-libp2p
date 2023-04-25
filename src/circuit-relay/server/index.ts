import { logger } from '@libp2p/logger'
import { createLimitedRelay } from '../utils.js'
import {
  CIRCUIT_PROTO_CODE,
  DEFAULT_HOP_TIMEOUT,
  RELAY_SOURCE_TAG
  , RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC
} from '../constants.js'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Startable } from '@libp2p/interfaces/startable'
import { ReservationStore, ReservationStoreInit } from './reservation-store.js'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import { AdvertService, AdvertServiceComponents, AdvertServiceInit } from './advert-service.js'
import pDefer from 'p-defer'
import { pbStream, ProtobufStream } from 'it-pb-stream'
import { HopMessage, Reservation, Status, StopMessage } from '../pb/index.js'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { CircuitRelayService, RelayReservation } from '../index.js'
import { EventEmitter } from '@libp2p/interfaces/events'
import { setMaxListeners } from 'events'
import type { PeerMap } from '@libp2p/peer-collections'

const log = logger('libp2p:circuit-relay:server')

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
}

export interface RelayServerEvents {
  'relay:reservation': CustomEvent<RelayReservation>
  'relay:advert:success': CustomEvent<unknown>
  'relay:advert:error': CustomEvent<Error>
}

class CircuitRelayServer extends EventEmitter<RelayServerEvents> implements Startable, CircuitRelayService {
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

  /**
   * Creates an instance of Relay
   */
  constructor (components: CircuitRelayServerComponents, init: CircuitRelayServerInit = {}) {
    super()

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

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, this.shutdownController.signal)
    } catch { }

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
        log.error(err)
      })
    }, {
      maxInboundStreams: this.maxInboundHopStreams,
      maxOutboundStreams: this.maxOutboundHopStreams
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
    log('received circuit v2 hop protocol stream from %s', connection.remotePeer)

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

      log('received', request.type)

      await Promise.race([
        this.handleHopProtocol({
          connection,
          stream: pbstr,
          request
        }),
        hopTimeoutPromise.promise
      ])
    } catch (err: any) {
      log.error('error while handling hop', err)
      pbstr.pb(HopMessage).write({
        type: HopMessage.Type.STATUS,
        status: Status.MALFORMED_MESSAGE
      })
      stream.abort(err)
    } finally {
      clearTimeout(timeout)
    }
  }

  async handleHopProtocol ({ stream, request, connection }: HopProtocolOptions): Promise<void> {
    log('received hop message')
    switch (request.type) {
      case HopMessage.Type.RESERVE: await this.handleReserve({ stream, request, connection }); break
      case HopMessage.Type.CONNECT: await this.handleConnect({ stream, request, connection }); break
      default: {
        log.error('invalid hop request type %s via peer %s', request.type, connection.remotePeer)
        stream.pb(HopMessage).write({ type: HopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE })
      }
    }
  }

  async handleReserve ({ stream, request, connection }: HopProtocolOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)
    log('hop reserve request from %s', connection.remotePeer)

    if (isRelayAddr(connection.remoteAddr)) {
      log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    if ((await this.connectionGater.denyInboundRelayReservation?.(connection.remotePeer)) === true) {
      log.error('reservation for %p denied by connection gater', connection.remotePeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    const result = this.reservationStore.reserve(connection.remotePeer, connection.remoteAddr)

    if (result.status !== Status.OK) {
      hopstr.write({ type: HopMessage.Type.STATUS, status: result.status })
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

      hopstr.write({
        type: HopMessage.Type.STATUS,
        status: Status.OK,
        reservation: await this.makeReservation(connection.remotePeer, BigInt(result.expire ?? 0)),
        limit: this.reservationStore.get(connection.remotePeer)?.limit
      })
      log('sent confirmation response to %s', connection.remotePeer)
    } catch (err) {
      log.error('failed to send confirmation response to %p', connection.remotePeer, err)
      this.reservationStore.removeReservation(connection.remotePeer)
    }
  }

  async makeReservation (
    remotePeer: PeerId,
    expire: bigint
  ): Promise<Reservation> {
    const addrs = []

    for (const relayAddr of this.addressManager.getAddresses()) {
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
      log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    log('hop connect request from %s', connection.remotePeer)

    let dstPeer: PeerId

    try {
      if (request.peer == null) {
        log.error('no peer info in hop connect request')
        throw new Error('no peer info in request')
      }

      request.peer.addrs.forEach(multiaddr)
      dstPeer = peerIdFromBytes(request.peer.id)
    } catch (err) {
      log.error('invalid hop connect request via peer %p %s', connection.remotePeer, err)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE })
      return
    }

    if (!this.reservationStore.hasReservation(dstPeer)) {
      log.error('hop connect denied for destination peer %p not having a reservation for %p with status %s', dstPeer, connection.remotePeer, Status.NO_RESERVATION)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
      return
    }

    if ((await this.connectionGater.denyOutboundRelayedConnection?.(connection.remotePeer, dstPeer)) === true) {
      log.error('hop connect for %p to %p denied by connection gater', connection.remotePeer, dstPeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
      return
    }

    const connections = this.connectionManager.getConnections(dstPeer)

    if (connections.length === 0) {
      log('hop connect denied for destination peer %p not having a connection for %p as there is no destination connection', dstPeer, connection.remotePeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
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
      log.error('failed to open stream to destination peer %s', destinationConnection?.remotePeer)
      hopstr.write({ type: HopMessage.Type.STATUS, status: Status.CONNECTION_FAILED })
      return
    }

    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.OK })
    const sourceStream = stream.unwrap()

    log('connection from %p to %p established - merging streans', connection.remotePeer, dstPeer)
    const limit = this.reservationStore.get(dstPeer)?.limit
    // Short circuit the two streams to create the relayed connection
    createLimitedRelay(sourceStream, destinationStream, this.shutdownController.signal, limit)
  }

  /**
   * Send a STOP request to the target peer that the dialing peer wants to contact
   */
  async stopHop ({
    connection,
    request
  }: StopOptions): Promise<Stream | undefined> {
    log('starting circuit relay v2 stop request to %s', connection.remotePeer)
    const stream = await connection.newStream([RELAY_V2_STOP_CODEC])
    const pbstr = pbStream(stream)
    const stopstr = pbstr.pb(StopMessage)
    stopstr.write(request)
    let response

    try {
      response = await stopstr.read()
    } catch (err) {
      log.error('error parsing stop message response from %s', connection.remotePeer)
    }

    if (response == null) {
      log.error('could not read response from %s', connection.remotePeer)
      stream.close()
      return
    }

    if (response.status === Status.OK) {
      log('stop request to %s was successful', connection.remotePeer)
      return pbstr.unwrap()
    }

    log('stop request failed with code %d', response.status)
    stream.close()
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
