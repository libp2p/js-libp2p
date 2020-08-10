'use strict'

const distance = require('xor-distance')
const utils = require('../utils')
const pMap = require('p-map')
const uint8ArrayEquals = require('uint8arrays/equals')

/**
 * Maintains a list of peerIds sorted by distance from a DHT key.
 */
class PeerDistanceList {
  /**
   * Creates a new PeerDistanceList.
   *
   * @param {Uint8Array} originDhtKey - the DHT key from which distance is calculated
   * @param {number} capacity - the maximum size of the list
   */
  constructor (originDhtKey, capacity) {
    this.originDhtKey = originDhtKey
    this.capacity = capacity
    this.peerDistances = []
  }

  /**
   * The length of the list
   */
  get length () {
    return this.peerDistances.length
  }

  /**
   * The peerIds in the list, in order of distance from the origin key
   */
  get peers () {
    return this.peerDistances.map(pd => pd.peerId)
  }

  /**
   * Add a peerId to the list.
   *
   * @param {PeerId} peerId
   * @returns {Promise<void>}
   */
  async add (peerId) {
    if (this.peerDistances.find(pd => uint8ArrayEquals(pd.peerId.id, peerId.id))) {
      return
    }

    const dhtKey = await utils.convertPeerId(peerId)
    const el = {
      peerId,
      distance: distance(this.originDhtKey, dhtKey)
    }

    this.peerDistances.push(el)
    this.peerDistances.sort((a, b) => distance.compare(a.distance, b.distance))
    this.peerDistances = this.peerDistances.slice(0, this.capacity)
  }

  /**
   * Indicates whether any of the peerIds passed as a parameter are closer
   * to the origin key than the furthest peerId in the PeerDistanceList.
   *
   * @param {Array<PeerId>} peerIds
   * @returns {Boolean}
   */
  async anyCloser (peerIds) {
    if (!peerIds.length) {
      return false
    }

    if (!this.length) {
      return true
    }

    const dhtKeys = await pMap(peerIds, (peerId) => utils.convertPeerId(peerId))

    const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance
    for (const dhtKey of dhtKeys) {
      const keyDistance = distance(this.originDhtKey, dhtKey)
      if (distance.compare(keyDistance, furthestDistance) < 0) {
        return true
      }
    }
    return false
  }
}

module.exports = PeerDistanceList
