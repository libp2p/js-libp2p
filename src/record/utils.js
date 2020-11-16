'use strict'

const Envelope = require('./envelope')
const PeerRecord = require('./peer-record')

/**
 * @typedef {import('../')} Libp2p
 */

/**
 * Create (or update if existing) self peer record and store it in the AddressBook.
 *
 * @param {Libp2p} libp2p
 * @returns {Promise<void>}
 */
async function updateSelfPeerRecord (libp2p) {
  const peerRecord = new PeerRecord({
    peerId: libp2p.peerId,
    multiaddrs: libp2p.multiaddrs
  })
  const envelope = await Envelope.seal(peerRecord, libp2p.peerId)
  libp2p.peerStore.addressBook.consumePeerRecord(envelope)
}

module.exports.updateSelfPeerRecord = updateSelfPeerRecord
