'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

module.exports = (node) => {
  /*
   * Helper method to check the data type of peer and convert it to PeerInfo
   */
  return function (peer, callback) {
    let p
    // PeerInfo
    if (PeerInfo.isPeerInfo(peer)) {
      p = peer
    // Multiaddr instance or Multiaddr String
    } else if (multiaddr.isMultiaddr(peer) || typeof peer === 'string') {
      if (typeof peer === 'string') {
        peer = multiaddr(peer)
      }

      const peerIdB58Str = peer.getPeerId()
      if (!peerIdB58Str) {
        throw new Error(`peer multiaddr instance or string must include peerId`)
      }

      try {
        p = node.peerBook.get(peerIdB58Str)
      } catch (err) {
        p = new PeerInfo(PeerId.createFromB58String(peerIdB58Str))
      }
      p.multiaddrs.add(peer)

      // PeerId
    } else if (PeerId.isPeerId(peer)) {
      const peerIdB58Str = peer.toB58String()
      try {
        p = node.peerBook.get(peerIdB58Str)
      } catch (err) {
        return node.peerRouting.findPeer(peer, callback)
      }
    } else {
      return setImmediate(() => callback(new Error('peer type not recognized')))
    }

    setImmediate(() => callback(null, p))
  }
}
