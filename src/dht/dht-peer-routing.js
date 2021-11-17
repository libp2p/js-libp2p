'use strict'

const errCode = require('err-code')
const { messages, codes } = require('../errors')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
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
    for await (const event of this._dht.findPeer(peerId, options)) {
      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
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
