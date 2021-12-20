'use strict'

const errCode = require('err-code')
const { messages, codes } = require('../errors')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 * @typedef {import('libp2p-kad-dht/dist/src/types').PeerData} PeerData
 */

/**
 * Wrapper class to convert events into returned values
 *
 * @implements {PeerRoutingModule}
 */
class DHTPeerRouting {
  /**
   * @param {import('libp2p-kad-dht').DHT} dht
   */
  constructor (dht) {
    this._dht = dht
  }

  /**
   * @param {PeerId} peerId
   * @param {any} options
   */
  async findPeer (peerId, options = {}) {
    /** @type {PeerData} */
    const result = {
      id: peerId,
      multiaddrs: []
    }
    let peerFound = false
    for await (const event of this._dht.findPeer(peerId, options)) {
      let multiaddrs 
      switch (event.name) {
        case 'FINAL_PEER':
          peerFound = true
          multiaddrs = event.peer.multiaddrs
          break
        case 'PEER_RESPONSE':
          peerFound = true
          const peer = event.closer.find(peerData => peerData.id.equals(peerId))

          if (peer) {
            multiaddrs = peer.multiaddrs
          }
          break
        default:
          continue
      }

      if (multiaddrs && multiaddrs.length > 0) {
        for (const multiaddr of multiaddrs) {
          let alreadyKnown = false
          for (const existing of result.multiaddrs) {
            if (existing.equals(multiaddr)) {
              alreadyKnown = true
            }
          }
          if (!alreadyKnown) {
            result.multiaddrs.push(multiaddr)
          }
        }
      }

      if (event.name === 'FINAL_PEER') {
        return result
      }
     
    }

    if (peerFound) {
      return result
    }

    throw errCode(new Error(messages.NOT_FOUND), codes.ERR_NOT_FOUND)
  }

  /**
   * @param {Uint8Array} key
   * @param {any} options
   */
  async * getClosestPeers (key, options = {}) {
    for await (const event of this._dht.getClosestPeers(key, options)) {
      if (event.name === 'PEER_RESPONSE') {
        yield * event.closer
      }
    }
  }
}

module.exports = { DHTPeerRouting }
