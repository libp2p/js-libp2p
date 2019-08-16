'use strict'

const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const proto = require('../protocol')
const { getPeerInfo } = require('../../get-peer-info')

module.exports = function (swarm) {
  /**
   * Get b58 string from multiaddr or peerinfo
   *
   * @param {Multiaddr|PeerInfo} peer
   * @return {*}
   */
  function getB58String (peer) {
    let b58Id = null
    if (multiaddr.isMultiaddr(peer)) {
      const relayMa = multiaddr(peer)
      b58Id = relayMa.getPeerId()
    } else if (PeerInfo.isPeerInfo(peer)) {
      b58Id = peer.id.toB58String()
    }

    return b58Id
  }

  /**
   * Helper to make a peer info from a multiaddrs
   *
   * @param {Multiaddr|PeerInfo|PeerId} peer
   * @return {PeerInfo}
   * @private
   */
  function peerInfoFromMa (peer) {
    return getPeerInfo(peer, swarm._peerBook)
  }

  /**
   * Checks if peer has an existing connection
   *
   * @param {String} peerId
   * @param {Swarm} swarm
   * @return {Boolean}
   */
  function isPeerConnected (peerId) {
    return swarm.muxedConns[peerId] || swarm.conns[peerId]
  }

  /**
   * Write a response
   *
   * @param {StreamHandler} streamHandler
   * @param {CircuitRelay.Status} status
   * @param {Function} cb
   * @returns {*}
   */
  function writeResponse (streamHandler, status, cb) {
    cb = cb || (() => {})
    streamHandler.write(proto.CircuitRelay.encode({
      type: proto.CircuitRelay.Type.STATUS,
      code: status
    }))
    return cb()
  }

  /**
   * Validate incomming HOP/STOP message
   *
   * @param {CircuitRelay} msg
   * @param {StreamHandler} streamHandler
   * @param {CircuitRelay.Type} type
   * @returns {*}
   * @param {Function} cb
   */
  function validateAddrs (msg, streamHandler, type, cb) {
    try {
      msg.dstPeer.addrs.forEach((addr) => {
        return multiaddr(addr)
      })
    } catch (err) {
      writeResponse(streamHandler, type === proto.CircuitRelay.Type.HOP
        ? proto.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID
        : proto.CircuitRelay.Status.STOP_DST_MULTIADDR_INVALID)
      return cb(err)
    }

    try {
      msg.srcPeer.addrs.forEach((addr) => {
        return multiaddr(addr)
      })
    } catch (err) {
      writeResponse(streamHandler, type === proto.CircuitRelay.Type.HOP
        ? proto.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID
        : proto.CircuitRelay.Status.STOP_SRC_MULTIADDR_INVALID)
      return cb(err)
    }

    return cb(null)
  }

  function peerIdFromId (id) {
    if (typeof id === 'string') {
      return PeerId.createFromB58String(id)
    }

    return PeerId.createFromBytes(id)
  }

  return {
    getB58String,
    peerInfoFromMa,
    isPeerConnected,
    validateAddrs,
    writeResponse,
    peerIdFromId
  }
}
