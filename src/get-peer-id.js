'use strict'

const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const errCode = require('err-code')

const { codes } = require('./errors')

/**
 * Converts the given `peer` to a `PeerId` instance.
 * If a multiaddr is received, the addressBook is updated.
 * @param {PeerId|Multiaddr|string} peer
 * @param {PeerStore} peerStore
 * @returns {PeerId}
 */
function getPeerId (peer, peerStore) {
  if (typeof peer === 'string') {
    peer = multiaddr(peer)
  }

  let addr
  if (multiaddr.isMultiaddr(peer)) {
    addr = peer
    try {
      peer = PeerId.createFromB58String(peer.getPeerId())
    } catch (err) {
      throw errCode(
        new Error(`${peer} is not a valid peer type`),
        codes.ERR_INVALID_MULTIADDR
      )
    }
  }

  if (addr && peerStore) {
    peerStore.addressBook.add(peer, [addr])
  }

  return peer
}

module.exports = getPeerId
