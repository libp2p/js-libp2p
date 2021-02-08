'use strict'

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../').PeerData} PeerData
 */

/**
 * A list of unique peers.
 */
class PeerList {
  constructor () {
    /** @type {PeerData[]} */
    this.list = []
  }

  /**
   * Add a new peer. Returns `true` if it was a new one
   *
   * @param {PeerData} peerData
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
   */
  has (peerId) {
    const match = this.list.find((i) => i.id.equals(peerId))
    return Boolean(match)
  }

  /**
   * Get the list as an array.
   */
  toArray () {
    return this.list.slice()
  }

  /**
   * Remove the last element
   */
  pop () {
    return this.list.pop()
  }

  /**
   * The length of the list
   */
  get length () {
    return this.list.length
  }
}

module.exports = PeerList
