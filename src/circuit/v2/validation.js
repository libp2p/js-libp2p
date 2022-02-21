'use strict'

const { Multiaddr } = require('multiaddr')
const { Status, StopMessage, HopMessage } = require('./protocol')

/**
 * @typedef {import('./stream-handler')} StreamHandler
 * @typedef {import('./protocol').IStopMessage} IStopMessage
 * @typedef {import('./protocol').IHopMessage} IHopMessage
 */

/**
 *
 * @param {IStopMessage} request
 * @param {StreamHandler} streamHandler
 */
function validateStopConnectRequest (request, streamHandler) {
  if (request.type !== StopMessage.Type.CONNECT) {
    writeStopMessageResponse(streamHandler, Status.UNEXPECTED_MESSAGE)
    throw new Error('Received unexpected stop status msg')
  }
  try {
    if (request.peer && request.peer.addrs) {
      request.peer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    } else {
      throw new Error('Missing peer info in stop request')
    }
  } catch (/** @type {any} */ err) {
    writeStopMessageResponse(streamHandler, Status.MALFORMED_MESSAGE)
    throw err
  }
}

/**
 *
 * @param {IHopMessage} request
 * @param {StreamHandler} streamHandler
 */
function validateHopConnectRequest (request, streamHandler) {
  // TODO: check if relay connection

  try {
    if (request.peer && request.peer.addrs) {
      request.peer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    } else {
      throw new Error('Missing peer info in hop connect request')
    }
  } catch (/** @type {any} */ err) {
    writeHopMessageResponse(streamHandler, Status.MALFORMED_MESSAGE)
    throw err
  }
}

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {import('./protocol').Status} status
 */
function writeStopMessageResponse (streamHandler, status) {
  streamHandler.write(StopMessage.encode(
    {
      type: StopMessage.Type.STATUS,
      status: status
    }
  ).finish())
}

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {import('./protocol').Status} status
 */
function writeHopMessageResponse (streamHandler, status) {
  streamHandler.write(HopMessage.encode(
    {
      type: HopMessage.Type.STATUS,
      status: status
    }
  ).finish())
}

module.exports.validateStopConnectRequest = validateStopConnectRequest
module.exports.validateHopConnectRequest = validateHopConnectRequest
