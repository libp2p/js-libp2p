'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

/**
 * Creates multiple PeerInfos
 * @param {number} length The number of `PeerInfo` to create
 * @returns {Promise<Array<PeerInfo>>}
 */
function createPeerInfo (length) {
  return Promise.all(
    Array.from({ length }).map(async () => {
      const id = await PeerId.create({ bits: 512 })
      return new PeerInfo(id)
    })
  )
}

module.exports = createPeerInfo
