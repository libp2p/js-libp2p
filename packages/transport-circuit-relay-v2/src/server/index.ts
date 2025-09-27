import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { Circuit } from '@multiformats/multiaddr-matcher'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import * as Digest from 'multiformats/hashes/digest'
import {
  DEFAULT_HOP_TIMEOUT,
  MAX_CONNECTIONS,
  RELAY_SOURCE_TAG,
  RELAY_V2_HOP_CODEC,
  RELAY_V2_STOP_CODEC
} from '../constants.js'
import { HopMessage, Status, StopMessage } from '../pb/index.js'
import { createLimitedRelay } from '../utils.js'
import { ReservationStore } from './reservation-store.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import type { CircuitRelayServerComponents, CircuitRelayServerInit, CircuitRelayService, RelayReservation } from '../index.js'
import type { Reservation } from '../pb/index.js'
import type { Logger, Connection, Stream, PeerId, Startable, AbortOptions } from '@libp2p/interface'
import type { PeerMap } from '@libp2p/peer-collections'
import type { ProtobufStream } from '@libp2p/utils'

export interface HopProtocolOptions {
  connection: Connection
  request: HopMessage
  stream: ProtobufStream<Stream>
}

export interface StopOptions {
  connection: Connection
  request: StopMessage
}

export interface RelayServerEvents {
  'relay:reservation': CustomEvent<RelayReservation>
  'relay:advert:success': CustomEvent<unknown>
  'relay:advert:error': CustomEvent<Error>
}

const defaults = {
  maxOutboundStopStreams: MAX_CONNECTIONS
}

export class CircuitRelayServer extends TypedEventEmitter<RelayServerEvents> implements Startable, CircuitRelayService {
  private readonly components: CircuitRelayServerComponents
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
    this.components = components
    this.started = false
    this.hopTimeout = init?.hopTimeout ?? DEFAULT_HOP_TIMEOUT
    this.maxInboundHopStreams = init.maxInboundHopStreams
    this.maxOutboundHopStreams = init.maxOutboundHopStreams
    this.maxOutboundStopStreams = init.maxOutboundStopStreams ?? defaults.maxOutboundStopStreams
    this.reservationStore = new ReservationStore(components, init.reservations)

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

    this.onHop = this.onHop.bind(this)
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

    await this.components.registrar.handle(RELAY_V2_HOP_CODEC, this.onHop, {
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
    await this.components.registrar.unhandle(RELAY_V2_HOP_CODEC)

    this.started = false
  }

  async onHop (stream: Stream, connection: Connection): Promise<void> {
    this.log('received circuit v2 hop protocol stream from %p', connection.remotePeer)

    const signal = AbortSignal.timeout(this.hopTimeout)
    setMaxListeners(Infinity, signal)

    const options = {
      signal
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
      this.log.error('error while handling hop - %e', err)
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

    if (Circuit.exactMatch(connection.remoteAddr)) {
      this.log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
      return
    }

    if ((await this.components.connectionGater.denyInboundRelayReservation?.(connection.remotePeer)) === true) {
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
        await this.components.peerStore.merge(connection.remotePeer, {
          tags: {
            [RELAY_SOURCE_TAG]: { value: 1, ttl }
          }
        }, options)
      }

      await hopstr.write({
        type: HopMessage.Type.STATUS,
        status: Status.OK,
        reservation: await this.makeReservation(connection.remotePeer, BigInt(result.expire ?? 0)),
        limit: this.reservationStore.get(connection.remotePeer)?.limit
      }, options)
      this.log('sent confirmation response to %s', connection.remotePeer)

      // close writable end of stream
      await hopstr.unwrap().unwrap().close(options)
    } catch (err) {
      this.log.error('failed to send confirmation response to %p - %e', connection.remotePeer, err)
      this.reservationStore.removeReservation(connection.remotePeer)

      try {
        await this.components.peerStore.merge(connection.remotePeer, {
          tags: {
            [RELAY_SOURCE_TAG]: undefined
          }
        }, options)
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

    for (const relayAddr of this.components.addressManager.getAddresses()) {
      if (relayAddr.toString().includes('/p2p-circuit')) {
        continue
      }

      addrs.push(relayAddr.bytes)
    }

    const envelope = await RecordEnvelope.seal(new ReservationVoucherRecord({
      peer: remotePeer,
      relay: this.components.peerId,
      expiration: expire
    }), this.components.privateKey)

    return {
      addrs,
      expire,
      voucher: {
        publicKey: publicKeyToProtobuf(envelope.publicKey),
        payloadType: envelope.payloadType,
        payload: {
          peer: remotePeer.toMultihash().bytes,
          relay: this.components.peerId.toMultihash().bytes,
          expiration: expire
        },
        signature: envelope.signature
      }
    }
  }

  async handleConnect ({ stream, request, connection }: HopProtocolOptions, options: AbortOptions): Promise<void> {
    const hopstr = stream.pb(HopMessage)

    if (Circuit.matches(connection.remoteAddr)) {
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
      this.log.error('invalid hop connect request via peer %p - %e', connection.remotePeer, err)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }, options)
      return
    }

    const reservation = this.reservationStore.get(dstPeer)

    if (reservation == null) {
      this.log.error('hop connect denied for destination peer %p not having a reservation for %p with status %s', dstPeer, connection.remotePeer, Status.NO_RESERVATION)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION }, options)
      return
    }

    if ((await this.components.connectionGater.denyOutboundRelayedConnection?.(connection.remotePeer, dstPeer)) === true) {
      this.log.error('hop connect for %p to %p denied by connection gater', connection.remotePeer, dstPeer)
      await hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED }, options)
      return
    }

    const connections = this.components.connectionManager.getConnections(dstPeer)

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

    this.log('connection from %p to %p established - merging streams', connection.remotePeer, dstPeer)

    // Short circuit the two streams to create the relayed connection
    createLimitedRelay(stream.unwrap(), destinationStream, this.shutdownController.signal, reservation, {
      log: this.log
    })
  }

  /**
   * Send a STOP request to the target peer that the dialing peer wants to contact
   */
  async stopHop ({ connection, request }: StopOptions, options: AbortOptions): Promise<Stream | undefined> {
    this.log('starting circuit relay v2 stop request to %s', connection.remotePeer)
    const stream = await connection.newStream(RELAY_V2_STOP_CODEC, {
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
      this.log.error('error parsing stop message response from %p - %e', connection.remotePeer, err)
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
