'use strict'

const PeerList = require('.')

/**
 * Like PeerList but with a length restriction.
 */
class LimitedPeerList extends PeerList {
  /**
   * Create a new limited peer list.
   *
   * @param {number} limit
   */
  constructor (limit) {
    super()
    this.limit = limit
  }

  /**
   * Add a PeerData if it fits in the list
   *
   * @param {PeerData} peerData
   * @returns {bool}
   */
  push (peerData) {
    if (this.length < this.limit) {
      return super.push(peerData)
    }
    return false
  }
}

module.exports = LimitedPeerList
