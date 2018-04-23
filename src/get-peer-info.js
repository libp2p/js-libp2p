'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

/**
 * Helper method to check the data type of peer and convert it to PeerInfo
 *
 * @param {PeerInfo|Multiaddr|PeerId} peer
 * @param {PeerBook} peerBook
 * @throws {InvalidPeerType}
 * @returns {PeerInfo}
 */
function getPeerInfo (peer, peerBook) {
  let peerInfo

  // Already a PeerInfo instance
  if (PeerInfo.isPeerInfo(peer)) {
    return peer
  }

  // Attempt to convert from Multiaddr instance (not string)
  if (multiaddr.isMultiaddr(peer)) {
    const peerIdB58Str = peer.getPeerId()
    try {
      peerInfo = peerBook.get(peerIdB58Str)
    } catch (err) {
      peerInfo = new PeerInfo(PeerId.createFromB58String(peerIdB58Str))
    }
    peerInfo.multiaddrs.add(peer)
    return peerInfo
  }

  // Attempt to convert from PeerId
  if (PeerId.isPeerId(peer)) {
    const peerIdB58Str = peer.toB58String()
    try {
      return peerBook.get(peerIdB58Str)
    } catch (err) {
      throw new Error('Couldnt get PeerInfo')
    }
  }

  throw new Error('peer type not recognized')
}

module.exports = getPeerInfo
