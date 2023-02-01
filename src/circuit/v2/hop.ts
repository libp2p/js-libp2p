import type { PeerId } from '@libp2p/interface-peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { logger } from '@libp2p/logger'
import { pipe } from 'it-pipe'
import type { Connection } from '@libp2p/interface-connection'
import { HopMessage, Limit, Reservation, Status, StopMessage } from './pb/index.js'
import { StreamHandlerV2 } from './stream-handler.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import type { Acl, ReservationStore } from './interfaces.js'
import { RELAY_V2_HOP_CODEC } from '../multicodec.js'
import { stop } from './stop.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'

const log = logger('libp2p:circuit:v2:hop')

export interface HopProtocolOptions {
  connection: Connection
  request: HopMessage
  streamHandler: StreamHandlerV2
  relayPeer: PeerId
  relayAddrs: Multiaddr[]
  limit?: Limit
  acl?: Acl
  reservationStore: ReservationStore
  connectionManager: ConnectionManager
}

export async function handleHopProtocol (options: HopProtocolOptions) {
  switch (options.request.type) {
    case HopMessage.Type.RESERVE: await handleReserve(options); break
    case HopMessage.Type.CONNECT: await handleConnect(options); break
    default: {
      log.error('invalid hop request type %s via peer %s', options.request.type, options.connection.remotePeer)
      writeErrorResponse(options.streamHandler, Status.MALFORMED_MESSAGE)
      options.streamHandler.close()
    }
  }
}

export async function reserve (connection: Connection) {
  log('requesting reservation from %s', connection.remotePeer)
  const stream = await connection.newStream([RELAY_V2_HOP_CODEC])
  const streamHandler = new StreamHandlerV2({ stream })
  const buf = HopMessage.encode({ type: HopMessage.Type.RESERVE })
  streamHandler.write(buf)

  let response: HopMessage
  try {
    response = HopMessage.decode(await streamHandler.read())
  } catch (e: any) {
    log.error('error passing reserve message response from %s because', connection.remotePeer, e.message)
    streamHandler.close()
    throw e
  }

  if (response.status === Status.OK && (response.reservation != null)) {
    return response.reservation
  }
  const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
  log.error(errMsg)
  throw new Error(errMsg)
}

async function handleReserve ({ connection, streamHandler, relayPeer, relayAddrs, limit, acl, reservationStore }: HopProtocolOptions) {
  log('hop reserve request from %s', connection.remotePeer)

  // TODO: prevent reservation over relay address

  if ((await acl?.allowReserve?.(connection.remotePeer, connection.remoteAddr)) === false) {
    log.error('acl denied reservation to %s', connection.remotePeer)
    writeErrorResponse(streamHandler, Status.PERMISSION_DENIED)
    streamHandler.close()
    return
  }

  const result = await reservationStore.reserve(connection.remotePeer, connection.remoteAddr)

  if (result.status !== Status.OK) {
    writeErrorResponse(streamHandler, result.status)
    streamHandler.close()
    return
  }

  try {
    writeResponse(
      streamHandler,
      {
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
  const { connection, streamHandler, request, reservationStore, connectionManager, acl } = options
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
    writeErrorResponse(streamHandler, Status.MALFORMED_MESSAGE)
    return
  }

  if (acl?.allowConnect !== undefined) {
    const status = await acl.allowConnect(connection.remotePeer, connection.remoteAddr, dstPeer)
    if (status !== Status.OK) {
      log.error('hop connect denied for %s with status %s', connection.remotePeer, status)
      writeErrorResponse(streamHandler, status)
      return
    }
  }

  if (!await reservationStore.hasReservation(dstPeer)) {
    log.error('hop connect denied for %s with status %s', connection.remotePeer, Status.NO_RESERVATION)
    writeErrorResponse(streamHandler, Status.NO_RESERVATION)
    return
  }

  const connections = connectionManager.getConnections(dstPeer)
  if (connections.length === 0) {
    log('hop connect denied for %s as there is no destination connection', connection.remotePeer)
    writeErrorResponse(streamHandler, Status.NO_RESERVATION)
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
    writeErrorResponse(streamHandler, Status.CONNECTION_FAILED)
    return
  }

  writeResponse(streamHandler, { type: HopMessage.Type.STATUS, status: Status.OK })

  const sourceStream = streamHandler.rest()
  log('connection to destination established, short circuiting streams...')
  // Short circuit the two streams to create the relayed connection
  return await pipe(
    sourceStream,
    destinationStream,
    sourceStream
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

/**
 * Write an error response and closes stream
 *
 */
function writeErrorResponse (streamHandler: StreamHandlerV2, status: Status) {
  writeResponse(streamHandler, {
    type: HopMessage.Type.STATUS,
    status
  })
  streamHandler.close()
}

/**
 * Write a response
 *
 */
function writeResponse (streamHandler: StreamHandlerV2, msg: HopMessage) {
  streamHandler.write(HopMessage.encode(msg))
}
