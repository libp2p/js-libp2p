'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuit:stop'), {
  error: debug('libp2p:circuit:stop:err')
})

const { CircuitRelay: CircuitPB } = require('../protocol')
const multicodec = require('../multicodec')
const StreamHandler = require('./stream-handler')
const { validateAddrs } = require('./utils')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('../protocol').ICircuitRelay} ICircuitRelay
 */

/**
 * Handles incoming STOP requests
 *
 * @private
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {ICircuitRelay} options.request - The CircuitRelay protobuf request (unencoded)
 * @param {StreamHandler} options.streamHandler
 * @returns {Promise<MuxedStream>|void} Resolves a duplex iterable
 */
module.exports.handleStop = function handleStop ({
  connection,
  request,
  streamHandler
}) {
  // Validate the STOP request has the required input
  try {
    validateAddrs(request, streamHandler)
  } catch (/** @type {any} */ err) {
    return log.error('invalid stop request via peer %s', connection.remotePeer.toB58String(), err)
  }

  // The request is valid
  log('stop request is valid')
  streamHandler.write({
    type: CircuitPB.Type.STATUS,
    code: CircuitPB.Status.SUCCESS
  })
  return streamHandler.rest()
}

/**
 * Creates a STOP request
 *
 * @private
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {ICircuitRelay} options.request - The CircuitRelay protobuf request (unencoded)
 * @returns {Promise<MuxedStream|void>} Resolves a duplex iterable
 */
module.exports.stop = async function stop ({
  connection,
  request
}) {
  const { stream } = await connection.newStream([multicodec.relay])
  log('starting stop request to %s', connection.remotePeer.toB58String())
  const streamHandler = new StreamHandler({ stream })

  streamHandler.write(request)
  const response = await streamHandler.read()

  if (!response) {
    return streamHandler.close()
  }

  if (response.code === CircuitPB.Status.SUCCESS) {
    log('stop request to %s was successful', connection.remotePeer.toB58String())
    return streamHandler.rest()
  }

  log('stop request failed with code %d', response.code)
  streamHandler.close()
}
