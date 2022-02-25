'use strict'

const debug = require('debug')
const { pipe } = require('it-pipe')
const PeerId = require('peer-id')
const Envelope = require('../../record/envelope')
const log = Object.assign(debug('libp2p:circuitv2:hop'), {
  error: debug('libp2p:circuitv2:hop:err')
})
const { HopMessage, Status, StopMessage } = require('./protocol')
const { stop } = require('./stop')
const { ReservationVoucherRecord } = require('./reservation-voucher')
const { validateHopConnectRequest } = require('./validation')
const { Multiaddr } = require('multiaddr')

/**
 * @typedef {import('./protocol').IHopMessage} IHopMessage
 * @typedef {import('./protocol').IReservation} IReservation
 * @typedef {import('./protocol').ILimit} ILimit
 * @typedef {import('./stream-handler')} StreamHandler
 * @typedef {import('./interfaces').ReservationStore} ReservationStore
 * @typedef {import('./interfaces').Acl} Acl
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('../transport')} Transport
 */

/**
 *
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {IHopMessage} options.request
 * @param {StreamHandler} options.streamHandler
 * @param {PeerId} options.relayPeer
 * @param {Multiaddr[]}options.relayAddrs
 * @param {Transport} options.circuit
 * @param {ILimit|null} options.limit
 * @param {Acl?} options.acl
 * @param {ReservationStore} options.reservationStore
 */
module.exports.handleHopProtocol = async function (options) {
  switch (options.request.type) {
    case HopMessage.Type.RESERVE: await handleReserve(options); break
    case HopMessage.Type.CONNECT: await handleConnect(options); break
    default: {
      log.error('invalid hop request type %s via peer %s', options.request.type, options.connection.remotePeer.toB58String())
      writeErrorResponse(options.streamHandler, Status.MALFORMED_MESSAGE)
      options.streamHandler.close()
    }
  }
}

/**
 *
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {StreamHandler} options.streamHandler
 * @param {ReservationStore} options.reservationStore
 * @param {PeerId} options.relayPeer
 * @param {Multiaddr[]}options.relayAddrs
 * @param {Acl?} options.acl
 * @param {ILimit?} options.limit
 */
async function handleReserve ({ connection, streamHandler, relayPeer, relayAddrs, limit, acl, reservationStore }) {
  log('hop reserve request from %s', connection.remotePeer.toB58String())

  // TODO: prevent reservation over relay address

  if (acl && acl.allowReserve && !acl.allowReserve(connection.remotePeer, connection.remoteAddr)) {
    log.error('acl denied reservation to %s', connection.remotePeer.toB58String())
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
        reservation: await makeReservation(relayAddrs, relayPeer, connection.remotePeer, result.expire || 0),
        limit
      })
    log('sent confirmation response to %s', connection.remotePeer.toB58String())
  } catch (err) {
    log.error('failed to send confirmation response to %s', connection.remotePeer.toB58String())
    await reservationStore.removeReservation(connection.remotePeer)
  }
  // TODO: how to ensure connection manager doesn't close reserved relay conn
}

/**
 *
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {IHopMessage} options.request
 * @param {ReservationStore} options.reservationStore
 * @param {StreamHandler} options.streamHandler
 * @param {Transport} options.circuit
 * @param {Acl?} options.acl
 */
async function handleConnect ({ connection, streamHandler, request, reservationStore, circuit, acl }) {
  log('hop connect request from %s', connection.remotePeer.toB58String())
  // Validate the HOP connect request has the required input
  try {
    validateHopConnectRequest(request, streamHandler)
  } catch (/** @type {any} */ err) {
    log.error('invalid hop connect request via peer %s', connection.remotePeer.toB58String(), err)
    writeErrorResponse(streamHandler, Status.MALFORMED_MESSAGE)
    return
  }

  // @ts-ignore peer is defined at this point
  const dstPeer = new PeerId(request.peer.id)

  if (acl && acl.allowConnect) {
    const status = await acl.allowConnect(connection.remotePeer, connection.remoteAddr, dstPeer)
    if (status !== Status.OK) {
      log.error('hop connect denied for %s with status %s', connection.remotePeer.toB58String(), status)
      writeErrorResponse(streamHandler, status)
      return
    }
  }

  if (!reservationStore.hasReservation(request.peer)) {
    log.error('hop connect denied for %s with status %s', connection.remotePeer.toB58String(), Status.NO_RESERVATION)
    writeErrorResponse(streamHandler, Status.NO_RESERVATION)
    return
  }

  const destinationConnection = circuit._connectionManager.get(dstPeer)
  if (!destinationConnection) {
    log('hop connect denied for %s as there is no destination connection', connection.remotePeer.toB58String())
    writeErrorResponse(streamHandler, Status.NO_RESERVATION)
    return
  }

  log('hop connect request from %s to %s is valid', connection.remotePeer.toB58String(), dstPeer.toB58String())

  const destinationStream = await stop({
    connection: destinationConnection,
    request: {
      type: StopMessage.Type.CONNECT,
      peer: {
        id: connection.remotePeer.id,
        addrs: [new Multiaddr(connection.remoteAddr).bytes]
      }
    }
  })

  if (!destinationStream) {
    log.error('failed to open stream to destination peer %s', destinationConnection?.remotePeer.toB58String())
    writeErrorResponse(streamHandler, Status.CONNECTION_FAILED)
    return
  }

  writeResponse(streamHandler, { type: HopMessage.Type.STATUS, status: Status.OK })

  const sourceStream = streamHandler.rest()
  log('connection to destination established, short circuiting streams...')
  // Short circuit the two streams to create the relayed connection
  return pipe([
    sourceStream,
    destinationStream,
    sourceStream
  ])
}

/**
 *
 * @param {Multiaddr[]} relayAddrs
 * @param {PeerId} relayPeerId
 * @param {PeerId} remotePeer
 * @param {number} expire
 * @returns {Promise<IReservation>}
 */
async function makeReservation (relayAddrs, relayPeerId, remotePeer, expire) {
  const addrs = []

  for (const relayAddr of relayAddrs) {
    addrs.push(relayAddr.bytes)
  }

  const voucher = await Envelope.seal(new ReservationVoucherRecord({
    peer: remotePeer,
    relay: relayPeerId,
    expiration: expire
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
 * @param {StreamHandler} streamHandler
 * @param {import('./protocol').Status} status
 */
function writeErrorResponse (streamHandler, status) {
  writeResponse(streamHandler, {
    type: HopMessage.Type.STATUS,
    status
  })
  streamHandler.close()
}

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {IHopMessage} msg
 */
function writeResponse (streamHandler, msg) {
  streamHandler.write(HopMessage.encode(msg).finish())
}
