'use strict'

const { Multiaddr } = require('multiaddr')
const { CircuitRelay } = require('../protocol')

/**
 * @typedef {import('./stream-handler')} StreamHandler
 * @typedef {import('../protocol').ICircuitRelay} ICircuitRelay
 */

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {import('../protocol').CircuitRelay.Status} status
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
 * @param {ICircuitRelay} msg - A CircuitRelay unencoded protobuf message
 * @param {StreamHandler} streamHandler
 */
function validateAddrs (msg, streamHandler) {
  try {
    if (msg.dstPeer && msg.dstPeer.addrs) {
      msg.dstPeer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    }
  } catch (err) {
    writeResponse(streamHandler, msg.type === CircuitRelay.Type.HOP
      ? CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID
      : CircuitRelay.Status.STOP_DST_MULTIADDR_INVALID)
    throw err
  }

  try {
    if (msg.srcPeer && msg.srcPeer.addrs) {
      msg.srcPeer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    }
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
