'use strict'

/**
 * A list of unique peers.
 */
class PeerList {
  constructor () {
    this.list = []
  }

  /**
   * Add a new peer. Returns `true` if it was a new one
   *
   * @param {PeerData} peerData
   * @returns {bool}
   */
  push (peerData) {
    if (!this.has(peerData.id)) {
      this.list.push(peerData)
      return true
    }
    return false
  }

  /**
   * Check if this PeerData is already in here.
   *
   * @param {PeerId} peerId
   * @returns {bool}
   */
  has (peerId) {
    const match = this.list.find((i) => i.id.isEqual(peerId))
    return Boolean(match)
  }

  /**
   * Get the list as an array.
   *
   * @returns {Array<PeerData>}
   */
  toArray () {
    return this.list.slice()
  }

  /**
   * Remove the last element
   *
   * @returns {PeerData}
   */
  pop () {
    return this.list.pop()
  }

  /**
   * The length of the list
   *
   * @type {number}
   */
  get length () {
    return this.list.length
  }
}

module.exports = PeerList
