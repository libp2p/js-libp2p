import type { PeerId } from '@libp2p/interface-peer-id'
import { RecordEnvelope } from '@libp2p/peer-record'
import { logger } from '@libp2p/logger'
import { pipe } from 'it-pipe'
import type { Connection } from '@libp2p/interface-connection'
import { HopMessage, Limit, Reservation, Status, StopMessage } from './pb/index.js'
import { StreamHandlerV2 } from './stream-handler.js'
import type { Circuit } from '../transport.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import type { Acl, ReservationStore } from './interfaces.js'
import { RELAY_V2_HOP_CODEC } from '../multicodec.js'
import { validateHopConnectRequest } from './validation.js'
import { stop } from './stop.js'
import { ReservationVoucherRecord } from './reservation-voucher.js'
import { peerIdFromBytes } from '@libp2p/peer-id'

const log = logger('libp2p:circuit:v2:hop')

export interface HopProtocolOptions {
  connection: Connection
  request: HopMessage
  streamHandler: StreamHandlerV2
  circuit: Circuit
  relayPeer: PeerId
  relayAddrs: Multiaddr[]
  limit?: Limit
  acl?: Acl
  reservationStore: ReservationStore
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
  streamHandler.write(HopMessage.encode({
    type: HopMessage.Type.RESERVE
  }))

  let response: HopMessage | undefined
  try {
    response = HopMessage.decode(await streamHandler.read())
  } catch (e: any) {
    log.error('error passing reserve message response from %s because', connection.remotePeer, e.message)
    streamHandler.close()
    throw e
  }

  if (response.status === Status.OK && response.reservation !== null) {
    return response.reservation
  }
  const errMsg = `reservation failed with status ${response.status ?? 'undefined'}`
  log.error(errMsg)
  throw new Error(errMsg)
}

async function handleReserve ({ connection, streamHandler, relayPeer, relayAddrs, limit, acl, reservationStore }: HopProtocolOptions) {
  log('hop reserve request from %s', connection.remotePeer)

  /* eslint-disable-next-line no-warning-comments */
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

  /* eslint-disable-next-line no-warning-comments */
  // TODO: how to ensure connection manager doesn't close reserved relay conn
}

type HopConnectOptions = Pick<
HopProtocolOptions,
'connection' | 'streamHandler' | 'request' | 'reservationStore' | 'circuit' | 'acl'
>

async function handleConnect (options: HopConnectOptions) {
  const { connection, streamHandler, request, reservationStore, circuit, acl } = options
  log('hop connect request from %s', connection.remotePeer)
  // Validate the HOP connect request has the required input
  try {
    validateHopConnectRequest(request, streamHandler)
  } catch (err: any) {
    log.error('invalid hop connect request via peer %s', connection.remotePeer, err)
    writeErrorResponse(streamHandler, Status.MALFORMED_MESSAGE)
    return
  }

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const dstPeer = peerIdFromBytes(request.peer!.id)

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

  const destinationConnection = circuit.getPeerConnection(dstPeer)
  if (destinationConnection === undefined || destinationConnection === null) {
    log('hop connect denied for %s as there is no destination connection', connection.remotePeer)
    writeErrorResponse(streamHandler, Status.NO_RESERVATION)
    return
  }

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

  if (!destinationStream) {
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
