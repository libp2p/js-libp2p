'use strict'

const PeerList = require('./peer-list')

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
   * Add a PeerInfo if it fits in the list
   *
   * @param {PeerInfo} info
   * @returns {bool}
   */
  push (info) {
    if (this.length < this.limit) {
      return super.push(info)
    }
    return false
  }
}

module.exports = LimitedPeerList
