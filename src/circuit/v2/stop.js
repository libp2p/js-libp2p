'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:circuitv2:stop'), {
  error: debug('libp2p:circuitv2:stop:err')
})
const multicodec = require('../multicodec')
const StreamHandler = require('./stream-handler')
const { StopMessage, Status } = require('./protocol')
const { validateStopConnectRequest } = require('./validation')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('./protocol').IStopMessage} IStopMessage
 */

/**
 * Handles incoming STOP requests
 *
 * @private
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {IStopMessage} options.request - The StopMessage protobuf request (unencoded)
 * @param {StreamHandler} options.streamHandler
 * @returns {Promise<MuxedStream|void>} Resolves a duplex iterable
 */
module.exports.handleStop = async function stopHandler ({
  connection,
  request,
  streamHandler
}) {
  log('new circuit relay v2 stop stream from %s', connection.remotePeer.toB58String())
  // Validate the STOP request has the required input
  try {
    validateStopConnectRequest(request, streamHandler)
  } catch (/** @type {any} */ err) {
    return log.error('invalid stop connect request via peer %s', connection.remotePeer.toB58String(), err)
  }
  log('stop request is valid')

  // TODO: go-libp2p marks connection transient if there is limit field present in request.
  // Cannot find any reference to transient connections in js-libp2p

  streamHandler.write(StopMessage.encode(
    {
      type: StopMessage.Type.STATUS,
      status: Status.OK
    }
  ).finish())
  return streamHandler.rest()
}

/**
 * Creates a STOP request
 *
 * @private
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {IStopMessage} options.request - The StopMessage protobuf request (unencoded)
 * @returns {Promise<MuxedStream|void>} Resolves a duplex iterable
 */
module.exports.stop = async function stop ({
  connection,
  request
}) {
  const { stream } = await connection.newStream([multicodec.protocolIDv2Stop])
  log('starting circuit relay v2 stop request to %s', connection.remotePeer.toB58String())
  const streamHandler = new StreamHandler({ stream })
  streamHandler.write(StopMessage.encode(request).finish())
  let response
  try {
    response = StopMessage.decode(await streamHandler.read())
  } catch (/** @type {any} */ err) {
    log.error('error parsing stop message response from %s', connection.remotePeer.toB58String())
  }

  if (!response) {
    return streamHandler.close()
  }

  if (response.status === Status.OK) {
    log('stop request to %s was successful', connection.remotePeer.toB58String())
    return streamHandler.rest()
  }

  log('stop request failed with code %d', response.status)
  streamHandler.close()
}
