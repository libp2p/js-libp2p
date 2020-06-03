'use strict'

const debug = require('debug')
const log = debug('libp2p:record-manager')
log.error = debug('libp2p:record-manager:error')

const Envelope = require('./envelope')
const PeerRecord = require('./peer-record')

/**
 * Responsible for managing the node signed peer record.
 * The record is generated on start and should be regenerated when
 * the public addresses of the peer change.
 */
class RecordManager {
  /**
   * @constructor
   * @param {Libp2p} libp2p
   */
  constructor (libp2p) {
    this.libp2p = libp2p
    this._signedPeerRecord = undefined // TODO: map for multiple domains?
  }

  /**
   * Start record manager. Compute current peer record and monitor address changes.
   * @return {void}
   */
  async start () {
    const peerRecord = new PeerRecord({
      peerId: this.libp2p.peerId,
      multiaddrs: this.libp2p.multiaddrs
    })

    this._signedPeerRecord = await Envelope.seal(peerRecord, this.libp2p.peerId)

    // TODO: listen for address changes on AddressManager
  }

  /**
   * Get signed peer record envelope.
   * @return {Envelope}
   */
  getPeerRecordEnvelope () {
    // TODO: create here if not existing?
    return this._signedPeerRecord
  }
}

module.exports = RecordManager
