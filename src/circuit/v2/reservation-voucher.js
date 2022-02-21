'use strict'

const { ReservationVoucher: Protobuf } = require('./protocol')

/**
 * @typedef {import('libp2p-interfaces/src/record/types').Record} Record
 * @typedef {import('peer-id')} PeerId
 */

/**
 * @implements Record
 */
class ReservationVoucherRecord {
  /**
   * The PeerRecord is used for distributing peer routing records across the network.
   * It contains the peer's reachable listen addresses.
   *
   * @class
   * @param {Object} params
   * @param {PeerId} params.relay
   * @param {PeerId} params.peer
   * @param {number} params.expiration
   */
  constructor ({ relay, peer, expiration }) {
    this.domain = 'libp2p-relay-rsvp'
    this.codec = new Uint8Array([0x03, 0x02])

    this.relay = relay
    this.peer = peer
    this.expiration = expiration
  }

  marshal () {
    return Protobuf.encode({
      relay: this.relay.toBytes(),
      peer: this.peer.toBytes(),
      expiration: this.expiration
    }).finish()
  }

  /**
   *
   * @param {this} other
   * @returns
   */
  equals (other) {
    if (!(other instanceof ReservationVoucherRecord)) {
      return false
    }
    if (!this.peer.equals(other.peer)) {
      return false
    }

    if (!this.relay.equals(other.relay)) {
      return false
    }

    if (this.expiration !== other.expiration) {
      return false
    }

    return true
  }
}

module.exports.ReservationVoucherRecord = ReservationVoucherRecord
