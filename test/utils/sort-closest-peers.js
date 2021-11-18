'use strict'

const { xor: uint8ArrayXor } = require('uint8arrays/xor')
const { compare: uint8ArrayCompare } = require('uint8arrays/compare')
const { convertPeerId } = require('../../src/utils')
const all = require('it-all')
const map = require('it-map')

/**
 * Sort peers by distance to the given `kadId`.
 *
 * @param {Array<PeerId>} peers
 * @param {Uint8Array} kadId
 */
exports.sortClosestPeers = async (peers, kadId) => {
  const distances = await all(map(peers, async (peer) => {
    const id = await convertPeerId(peer)

    return {
      peer: peer,
      distance: uint8ArrayXor(id, kadId)
    }
  }))

  return distances
    .sort((a, b) => {
      return uint8ArrayCompare(a.distance, b.distance)
    })
    .map((d) => d.peer)
}
