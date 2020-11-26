'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit:hop'), {
  error: debug('libp2p:circuit:hop:err')
})
const errCode = require('err-code')

const PeerId = require('peer-id')
const { validateAddrs } = require('./utils')
const StreamHandler = require('./stream-handler')
const { CircuitRelay: CircuitPB } = require('../protocol')
const { pipe } = require('it-pipe')
const { codes: Errors } = require('../../errors')

const { stop } = require('./stop')

const multicodec = require('./../multicodec')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */

module.exports.handleHop = async function handleHop ({
  connection,
  request,
  streamHandler,
  circuit
}) {
  // Ensure hop is enabled
  if (!circuit._options.hop.enabled) {
    log('HOP request received but we are not acting as a relay')
    return streamHandler.end({
      type: CircuitPB.Type.STATUS,
      code: CircuitPB.Status.HOP_CANT_SPEAK_RELAY
    })
  }

  // Validate the HOP request has the required input
  try {
    validateAddrs(request, streamHandler)
  } catch (err) {
    return log.error('invalid hop request via peer %s', connection.remotePeer.toB58String(), err)
  }

  // Get the connection to the destination (stop) peer
  const destinationPeer = new PeerId(request.dstPeer.id)

  const destinationConnection = circuit._connectionManager.get(destinationPeer)
  if (!destinationConnection && !circuit._options.hop.active) {
    log('HOP request received but we are not connected to the destination peer')
    return streamHandler.end({
      type: CircuitPB.Type.STATUS,
      code: CircuitPB.Status.HOP_NO_CONN_TO_DST
    })
  }

  // TODO: Handle being an active relay

  // Handle the incoming HOP request by performing a STOP request
  const stopRequest = {
    type: CircuitPB.Type.STOP,
    dstPeer: request.dstPeer,
    srcPeer: request.srcPeer
  }

  let destinationStream
  try {
    destinationStream = await stop({
      connection: destinationConnection,
      request: stopRequest,
      circuit
    })
  } catch (err) {
    return log.error(err)
  }

  log('hop request from %s is valid', connection.remotePeer.toB58String())
  streamHandler.write({
    type: CircuitPB.Type.STATUS,
    code: CircuitPB.Status.SUCCESS
  })
  const sourceStream = streamHandler.rest()

  // Short circuit the two streams to create the relayed connection
  return pipe(
    sourceStream,
    destinationStream,
    sourceStream
  )
}

/**
 * Performs a HOP request to a relay peer, to request a connection to another
 * peer. A new, virtual, connection will be created between the two via the relay.
 *
 * @param {object} options
 * @param {Connection} options.connection - Connection to the relay
 * @param {*} options.request
 * @returns {Promise<Connection>}
 */
module.exports.hop = async function hop ({
  connection,
  request
}) {
  // Create a new stream to the relay
  const { stream } = await connection.newStream([multicodec.relay])
  // Send the HOP request
  const streamHandler = new StreamHandler({ stream })
  streamHandler.write(request)

  const response = await streamHandler.read()

  if (response.code === CircuitPB.Status.SUCCESS) {
    log('hop request was successful')
    return streamHandler.rest()
  }

  log('hop request failed with code %d, closing stream', response.code)
  streamHandler.close()
  throw errCode(new Error(`HOP request failed with code ${response.code}`), Errors.ERR_HOP_REQUEST_FAILED)
}

/**
 * Performs a CAN_HOP request to a relay peer, in order to understand its capabilities.
 *
 * @param {object} options
 * @param {Connection} options.connection - Connection to the relay
 * @returns {Promise<boolean>}
 */
module.exports.canHop = async function canHop ({
  connection
}) {
  // Create a new stream to the relay
  const { stream } = await connection.newStream([multicodec.relay])
  // Send the HOP request
  const streamHandler = new StreamHandler({ stream })
  streamHandler.write({
    type: CircuitPB.Type.CAN_HOP
  })

  const response = await streamHandler.read()
  await streamHandler.close()

  if (response.code !== CircuitPB.Status.SUCCESS) {
    return false
  }

  return true
}

/**
 * Creates an unencoded CAN_HOP response based on the Circuits configuration
 *
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {StreamHandler} options.streamHandler
 * @param {Circuit} options.circuit
 * @private
 */
module.exports.handleCanHop = function handleCanHop ({
  connection,
  streamHandler,
  circuit
}) {
  const canHop = circuit._options.hop.enabled
  log('can hop (%s) request from %s', canHop, connection.remotePeer.toB58String())
  streamHandler.end({
    type: CircuitPB.Type.STATUS,
    code: canHop ? CircuitPB.Status.SUCCESS : CircuitPB.Status.HOP_CANT_SPEAK_RELAY
  })
}
