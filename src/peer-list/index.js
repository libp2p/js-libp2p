'use strict'

/**
 * @typedef {import('peer-id')} PeerId
 */

/**
 * A list of unique peers.
 */
class PeerList {
  constructor () {
    /** @type {PeerId[]} */
    this.list = []
  }

  /**
   * Add a new peer. Returns `true` if it was a new one
   *
   * @param {PeerId} peerId
   */
  push (peerId) {
    if (!this.has(peerId)) {
      this.list.push(peerId)

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
    const match = this.list.find((i) => i.equals(peerId))
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
