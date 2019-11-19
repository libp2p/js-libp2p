'use strict'

/**
 * A list of unique peer infos.
 */
class PeerList {
  constructor () {
    this.list = []
  }

  /**
   * Add a new info. Returns `true` if it was a new one
   *
   * @param {PeerInfo} info
   * @returns {bool}
   */
  push (info) {
    if (!this.has(info)) {
      this.list.push(info)
      return true
    }
    return false
  }

  /**
   * Check if this PeerInfo is already in here.
   *
   * @param {PeerInfo} info
   * @returns {bool}
   */
  has (info) {
    const match = this.list.find((i) => i.id.isEqual(info.id))
    return Boolean(match)
  }

  /**
   * Get the list as an array.
   *
   * @returns {Array<PeerInfo>}
   */
  toArray () {
    return this.list.slice()
  }

  /**
   * Remove the last element
   *
   * @returns {PeerInfo}
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
