'use strict'

const multiaddr = require('multiaddr')
const { CircuitRelay } = require('../protocol')

/**
 * @typedef {import('./stream-handler')} StreamHandler
 * @typedef {import('../../types').CircuitStatus} CircuitStatus
 */

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {CircuitStatus} status
 */
function writeResponse (streamHandler, status) {
  streamHandler.write({
    type: CircuitRelay.Type.STATUS,
    code: status
  })
}

/**
 * Validate incomming HOP/STOP message
 *
 * @param {*} msg - A CircuitRelay unencoded protobuf message
 * @param {StreamHandler} streamHandler
 */
function validateAddrs (msg, streamHandler) {
  try {
    msg.dstPeer.addrs.forEach((/** @type {string} */ addr) => {
      return multiaddr(addr)
    })
  } catch (err) {
    writeResponse(streamHandler, msg.type === CircuitRelay.Type.HOP
      ? CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID
      : CircuitRelay.Status.STOP_DST_MULTIADDR_INVALID)
    throw err
  }

  try {
    msg.srcPeer.addrs.forEach((/** @type {string} */ addr) => {
      return multiaddr(addr)
    })
  } catch (err) {
    writeResponse(streamHandler, msg.type === CircuitRelay.Type.HOP
      ? CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID
      : CircuitRelay.Status.STOP_SRC_MULTIADDR_INVALID)
    throw err
  }
}

module.exports = {
  validateAddrs
}
