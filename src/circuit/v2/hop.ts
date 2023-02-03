import type { PeerId } from '@libp2p/interface-peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { logger } from '@libp2p/logger'
import { pipe } from 'it-pipe'
import type { Connection } from '@libp2p/interface-connection'
import { HopMessage, Limit, Reservation, Status, StopMessage } from './pb/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import type { Acl, ReservationStore } from './interfaces.js'
import { RELAY_V2_HOP_CODEC } from '../multicodec.js'
import { stop } from './stop.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { ProtobufStream } from 'it-pb-stream'
import { pbStream } from 'it-pb-stream'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Duplex } from 'it-stream-types'
import { CIRCUIT_PROTO_CODE } from '../constants.js'

const log = logger('libp2p:circuit:v2:hop')

export interface HopProtocolOptions {
  connection: Connection
  request: HopMessage
  pbstr: ProtobufStream
  relayPeer: PeerId
  relayAddrs: Multiaddr[]
  limit?: Limit
  acl?: Acl
  reservationStore: ReservationStore
  connectionManager: ConnectionManager
}

export async function handleHopProtocol (options: HopProtocolOptions) {
  const { pbstr, request } = options
  log('received hop message')
  switch (request.type) {
    case HopMessage.Type.RESERVE: await handleReserve(options); break
    case HopMessage.Type.CONNECT: await handleConnect(options); break
    default: {
      log.error('invalid hop request type %s via peer %s', options.request.type, options.connection.remotePeer)
      pbstr.pb(HopMessage).write({ type: HopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE })
    }
  }
}

export async function reserve (connection: Connection) {
  log('requesting reservation from %s', connection.remotePeer)
  const stream = await connection.newStream([RELAY_V2_HOP_CODEC])
  const pbstr = pbStream(stream)
  const hopstr = pbstr.pb(HopMessage)
  hopstr.write({ type: HopMessage.Type.RESERVE })

  let response: HopMessage
  try {
    response = await hopstr.read()
  } catch (e: any) {
    log.error('error passing reserve message response from %s because', connection.remotePeer, e.message)
    stream.close()
    throw e
  }

  if (response.status === Status.OK && (response.reservation != null)) {
    return response.reservation
  }
  const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
  log.error(errMsg)
  throw new Error(errMsg)
}

const isRelayAddr = (ma: Multiaddr): boolean => ma.protoCodes().includes(CIRCUIT_PROTO_CODE)

async function handleReserve ({ connection, pbstr, relayPeer, relayAddrs, limit, acl, reservationStore }: HopProtocolOptions) {
  const hopstr = pbstr.pb(HopMessage)
  log('hop reserve request from %s', connection.remotePeer)

  if (isRelayAddr(connection.remoteAddr)) {
    log.error('relay reservation over circuit connection denied for peer: %p', connection.remotePeer)
    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
    return
  }

  if ((await acl?.allowReserve?.(connection.remotePeer, connection.remoteAddr)) === false) {
    log.error('acl denied reservation to %s', connection.remotePeer)
    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.PERMISSION_DENIED })
    return
  }

  const result = await reservationStore.reserve(connection.remotePeer, connection.remoteAddr)

  if (result.status !== Status.OK) {
    hopstr.write({ type: HopMessage.Type.STATUS, status: result.status })
    return
  }

  try {
    hopstr.write({
      type: HopMessage.Type.STATUS,
      status: Status.OK,
      reservation: await makeReservation(relayAddrs, relayPeer, connection.remotePeer, BigInt(result.expire ?? 0)),
      limit
    })
    log('sent confirmation response to %s', connection.remotePeer)
  } catch (err) {
    log.error('failed to send confirmation response to %s', connection.remotePeer)
    await reservationStore.removeReservation(connection.remotePeer)
  }

  // TODO: how to ensure connection manager doesn't close reserved relay conn
}

async function handleConnect (options: HopProtocolOptions) {
  const { connection, pbstr, request, reservationStore, connectionManager, acl } = options
  const hopstr = pbstr.pb(HopMessage)

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

  if (acl?.allowConnect !== undefined) {
    const status = await acl.allowConnect(connection.remotePeer, connection.remoteAddr, dstPeer)
    if (status !== Status.OK) {
      log.error('hop connect denied for %s with status %s', connection.remotePeer, status)
      hopstr.write({ type: HopMessage.Type.STATUS, status: status })
      return
    }
  }

  if (!await reservationStore.hasReservation(dstPeer)) {
    log.error('hop connect denied for %s with status %s', connection.remotePeer, Status.NO_RESERVATION)
    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
    return
  }

  const connections = connectionManager.getConnections(dstPeer)
  if (connections.length === 0) {
    log('hop connect denied for %s as there is no destination connection', connection.remotePeer)
    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.NO_RESERVATION })
    return
  }
  const destinationConnection = connections[0]
  log('hop connect request from %s to %s is valid', connection.remotePeer, dstPeer)

  const destinationStream = await stop({
    connection: destinationConnection,
    request: {
      type: StopMessage.Type.CONNECT,
      peer: {
        id: connection.remotePeer.toBytes(),
        addrs: [multiaddr('/p2p/' + connection.remotePeer.toString()).bytes]
      }
    }
  })

  if (destinationStream == null) {
    log.error('failed to open stream to destination peer %s', destinationConnection?.remotePeer)
    hopstr.write({ type: HopMessage.Type.STATUS, status: Status.CONNECTION_FAILED })
    return
  }

  hopstr.write({ type: HopMessage.Type.STATUS, status: Status.OK })
  const sourceStream = pbstr.unwrap()

  log('connection to destination established, short circuiting streams...')
  // Short circuit the two streams to create the relayed connection
  return await pipe(
    sourceStream as Duplex<Uint8ArrayList, Uint8Array | Uint8ArrayList>,
    // adapt uint8arraylist to uint8array
    // async function * (src) {
    //   for await(const buf of src) {
    //     yield buf.subarray()
    //   }
    // },
    destinationStream as Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>,
    // adapt uint8arraylist to uint8array
    // async function * (src) {
    //   for await(const buf of src) {
    //     yield buf.subarray()
    //   }
    // },
    sourceStream as Duplex<Uint8ArrayList, Uint8Array | Uint8ArrayList>
  )
}

async function makeReservation (
  relayAddrs: Multiaddr[],
  relayPeerId: PeerId,
  remotePeer: PeerId,
  expire: bigint
): Promise<Reservation> {
  const addrs = []

  for (const relayAddr of relayAddrs) {
    addrs.push(relayAddr.bytes)
  }

  const voucher = await RecordEnvelope.seal(new ReservationVoucherRecord({
    peer: remotePeer,
    relay: relayPeerId,
    expiration: Number(expire)
  }), relayPeerId)

  return {
    addrs,
    expire,
    voucher: voucher.marshal()
  }
}
