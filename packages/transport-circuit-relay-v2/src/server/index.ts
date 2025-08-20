import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import * as Digest from 'multiformats/hashes/digest'
import {
  CIRCUIT_PROTO_CODE,
  DEFAULT_HOP_TIMEOUT,
  KEEP_ALIVE_SOURCE_TAG,
  MAX_CONNECTIONS,
  RELAY_SOURCE_TAG,
  RELAY_V2_HOP_CODEC,
  RELAY_V2_STOP_CODEC
} from '../constants.js'
import { HopMessage, Status, StopMessage } from '../pb/index.js'
import { createLimitedRelay } from '../utils.js'
import { ReservationStore } from './reservation-store.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import type { ReservationStoreInit } from './reservation-store.js'
import type { CircuitRelayService, RelayReservation } from '../index.js'
import type { Reservation } from '../pb/index.js'
import type { ComponentLogger, Logger, Connection, Stream, ConnectionGater, PeerId, PeerStore, Startable, PrivateKey, Metrics, AbortOptions, IncomingStreamData } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProtobufStream } from 'it-protobuf-stream'

const isRelayAddr = (ma: Multiaddr): boolean => ma.protoCodes().includes(CIRCUIT_PROTO_CODE)

export interface CircuitRelayServerInit {
  /**
   * Incoming hop requests must complete within this time in ms otherwise
   * the stream will be reset
   *
   * @default 30000
   */
  hopTimeout?: number

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
   * once.
   *
   * @default 300
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

export interface CircuitRelayServerComponents {
  registrar: Registrar
  peerStore: PeerStore
  addressManager: AddressManager
  peerId: PeerId
  privateKey: PrivateKey
  connectionManager: ConnectionManager
  connectionGater: ConnectionGater
  logger: ComponentLogger
  metrics?: Metrics
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
  private readonly privateKey: PrivateKey
  private readonly connectionManager: ConnectionManager
  private readonly connectionGater: ConnectionGater
  private readonly reservationStore: ReservationStore
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
    this.privateKey = components.privateKey
    this.connectionManager = components.connectionManager
    this.connectionGater = components.connectionGater
    this.started = false
    this.hopTimeout = init?.hopTimeout ?? DEFAULT_HOP_TIMEOUT
    this.maxInboundHopStreams = init.maxInboundHopStreams
    this.maxOutboundHopStreams = init.maxOutboundHopStreams
    this.maxOutboundStopStreams = init.maxOutboundStopStreams ?? defaults.maxOutboundStopStreams
    this.reservationStore = new ReservationStore(components, init.reservations)

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
  }

  readonly [Symbol.toStringTag] = '@libp2p/circuit-relay-v2-server'

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

    await this.registrar.handle(RELAY_V2_HOP_CODEC, (data) => {
      void this.onHop(data).catch(err => {
        this.log.error(err)
      })
    }, {
      maxInboundStreams: this.maxInboundHopStreams,
      maxOutboundStreams: this.maxOutboundHopStreams,
      runOnLimitedConnection: true
    })

    this.started = true
  }

  /**
   * Stop Relay service
   */
  async stop (): Promise<void> {
    this.reservationStore.clear()
    this.shutdownController.abort()
    await this.registrar.unhandle(RELAY_V2_HOP_CODEC)

    this.started = false
  }

  async onHop ({ connection, stream }: IncomingStreamData): Promise<void> {
    this.log('received circuit v2 hop protocol stream from %p', connection.remotePeer)

    const options = {
      signal: AbortSignal.timeout(this.hopTimeout)
    }
    const pbstr = pbStream(stream)

    try {
      const request: HopMessage = await pbstr.pb(HopMessage).read(options)

      if (request?.type == null) {
        throw new Error('request was invalid, could not read from stream')
      }

      this.log('received', request.type)

      await this.handleHopProtocol({
        connection,
        stream: pbstr,
        request
      }, options)
    } catch (err: any) {
      this.log.error('error while handling hop', err)
      await pbstr.pb(HopMessage).write({
        type: HopMessage.Type.STATUS,
        status: Status.MALFORMED_MESSAGE
      }, options)
      stream.abort(err)
    }
  }

  async handleHopProtocol ({ stream, request, connection }: HopProtocolOptions, options: AbortOptions): Promise<void> {
    this.log('received hop message')
    switch (request.type) {
      case HopMessage.Type.RESERVE: await this.handleReserve({ stream, request, connection }, options); break
      case HopMessage.Type.CONNECT: await this.handleConnect({ stream, request, connection }, options); break
      default: {
        this.log.error('invalid hop request type %s via peer %p', request.type, connection.remotePeer)
        await stream.pb(HopMessage).write({ type: HopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE })
      }
    }
  }

  async handleReserve ({ stream, connection }: HopProtocolOptions, options: AbortOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)
    this.log('hop reserve request from %p', connection.remotePeer)

    if (isRelayAddr(connection.remoteAddr)) {
      this.log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
      return
    }

    if ((await this.connectionGater.denyInboundRelayReservation?.(connection.remotePeer)) === true) {
      this.log.error('reservation for %p denied by connection gater', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
      return
    }

    const result = this.reservationStore.reserve(connection.remotePeer, connection.remoteAddr)

    try {
      if (result.status !== Status.OK) {
        await hopstr.write({ type: HopMessage.Type.STATUS, status: result.status }, options)
        return
      }

      // tag relay target peer
      // result.expire is non-null if `ReservationStore.reserve` returns with status == OK
      if (result.expire != null) {
        const ttl = (result.expire * 1000) - Date.now()
        await this.peerStore.merge(connection.remotePeer, {
          tags: {
            [RELAY_SOURCE_TAG]: { value: 1, ttl },
            [KEEP_ALIVE_SOURCE_TAG]: { value: 1, ttl }
          }
        })
      }

      await hopstr.write({
        type: HopMessage.Type.STATUS,
        status: Status.OK,
        reservation: await this.makeReservation(connection.remotePeer, BigInt(result.expire ?? 0)),
        limit: this.reservationStore.get(connection.remotePeer)?.limit
      }, options)
      this.log('sent confirmation response to %s', connection.remotePeer)
    } catch (err) {
      this.log.error('failed to send confirmation response to %p - %e', connection.remotePeer, err)
      this.reservationStore.removeReservation(connection.remotePeer)

      try {
        await this.peerStore.merge(connection.remotePeer, {
          tags: {
            [RELAY_SOURCE_TAG]: undefined,
            [KEEP_ALIVE_SOURCE_TAG]: undefined
          }
        })
      } catch (err) {
        this.log.error('failed to untag relay source peer %p - %e', connection.remotePeer, err)
      }
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

    const envelope = await RecordEnvelope.seal(new ReservationVoucherRecord({
      peer: remotePeer,
      relay: this.peerId,
      expiration: expire
    }), this.privateKey)

    return {
      addrs,
      expire,
      voucher: {
        publicKey: publicKeyToProtobuf(envelope.publicKey),
        payloadType: envelope.payloadType,
        payload: {
          peer: remotePeer.toMultihash().bytes,
          relay: this.peerId.toMultihash().bytes,
          expiration: expire
        },
        signature: envelope.signature
      }
    }
  }

  async handleConnect ({ stream, request, connection }: HopProtocolOptions, options: AbortOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)

    if (isRelayAddr(connection.remoteAddr)) {
      this.log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
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
      dstPeer = peerIdFromMultihash(Digest.decode(request.peer.id))
    } catch (err) {
      this.log.error('invalid hop connect request via peer %p %s', connection.remotePeer, err)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, options)
      return
    }

    const reservation = this.reservationStore.get(dstPeer)

    if (reservation == null) {
      this.log.error('hop connect denied for destination peer %p not having a reservation for %p with status %s', dstPeer, connection.remotePeer, Status.NO_RESERVATION)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION }, options)
      return
    }

    if ((await this.connectionGater.denyOutboundRelayedConnection?.(connection.remotePeer, dstPeer)) === true) {
      this.log.error('hop connect for %p to %p denied by connection gater', connection.remotePeer, dstPeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
      return
    }

    const connections = this.connectionManager.getConnections(dstPeer)

    if (connections.length === 0) {
      this.log('hop connect denied for destination peer %p not having a connection for %p as there is no destination connection', dstPeer, connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION }, options)
      return
    }

    const destinationConnection = connections[0]

    const destinationStream = await this.stopHop({
      connection: destinationConnection,
      request: {
        type: StopMessage.Type.CONNECT,
        peer: {
          id: connection.remotePeer.toMultihash().bytes,
          addrs: []
        },
        limit: reservation?.limit
      }
    }, options)

    if (destinationStream == null) {
      this.log.error('failed to open stream to destination peer %p', destinationConnection?.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.CONNECTION_FAILED }, options)
      return
    }

    await hopstr.write({
      type: HopMessage.Type.STATUS,
      status: Status.OK,
      limit: reservation?.limit
    }, options)
    const sourceStream = stream.unwrap()

    this.log('connection from %p to %p established - merging streams', connection.remotePeer, dstPeer)

    // Short circuit the two streams to create the relayed connection
    createLimitedRelay(sourceStream, destinationStream, this.shutdownController.signal, reservation, {
      log: this.log
    })
  }

  /**
   * Send a STOP request to the target peer that the dialing peer wants to contact
   */
  async stopHop ({ connection, request }: StopOptions, options: AbortOptions): Promise<Stream | undefined> {
    this.log('starting circuit relay v2 stop request to %s', connection.remotePeer)
    const stream = await connection.newStream([RELAY_V2_STOP_CODEC], {
      maxOutboundStreams: this.maxOutboundStopStreams,
      runOnLimitedConnection: true,
      ...options
    })
    const pbstr = pbStream(stream)
    const stopstr = pbstr.pb(StopMessage)
    await stopstr.write(request, options)
    let response

    try {
      response = await stopstr.read(options)
    } catch (err) {
      this.log.error('error parsing stop message response from %p', connection.remotePeer)
    }

    if (response == null) {
      this.log.error('could not read response from %p', connection.remotePeer)
      await stream.close(options)
      return
    }

    if (response.status === Status.OK) {
      this.log('stop request to %p was successful', connection.remotePeer)
      return pbstr.unwrap()
    }

    this.log('stop request failed with code %d', response.status)
    await stream.close(options)
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
