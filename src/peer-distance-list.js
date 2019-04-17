'use strict'

const distance = require('xor-distance')
const utils = require('./utils')
const map = require('async/map')

/**
 * Maintains a list of peerIds sorted by distance from a DHT key.
 */
class PeerDistanceList {
  /**
   * Creates a new PeerDistanceList.
   *
   * @param {Buffer} originDhtKey - the DHT key from which distance is calculated
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
   * @param {function(Error)} callback
   * @returns {void}
   */
  add (peerId, callback) {
    if (this.peerDistances.find(pd => pd.peerId.id.equals(peerId.id))) {
      return callback()
    }

    utils.convertPeerId(peerId, (err, dhtKey) => {
      if (err) {
        return callback(err)
      }

      const el = {
        peerId,
        distance: distance(this.originDhtKey, dhtKey)
      }

      this.peerDistances.push(el)
      this.peerDistances.sort((a, b) => distance.compare(a.distance, b.distance))
      this.peerDistances = this.peerDistances.slice(0, this.capacity)

      callback()
    })
  }

  /**
   * Indicates whether any of the peerIds passed as a parameter are closer
   * to the origin key than the furthest peerId in the PeerDistanceList.
   *
   * @param {Array<PeerId>} peerIds
   * @param {function(Error, Boolean)} callback
   * @returns {void}
   */
  anyCloser (peerIds, callback) {
    if (!peerIds.length) {
      return callback(null, false)
    }

    if (!this.length) {
      return callback(null, true)
    }

    map(peerIds, (peerId, cb) => utils.convertPeerId(peerId, cb), (err, dhtKeys) => {
      if (err) {
        return callback(err)
      }

      const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance
      for (const dhtKey of dhtKeys) {
        const keyDistance = distance(this.originDhtKey, dhtKey)
        if (distance.compare(keyDistance, furthestDistance) < 0) {
          return callback(null, true)
        }
      }
      return callback(null, false)
    })
  }
}

module.exports = PeerDistanceList
