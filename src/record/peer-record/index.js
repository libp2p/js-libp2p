'use strict'

const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const arrayEquals = require('libp2p-utils/src/array-equals')

const { PeerRecord: Protobuf } = require('./peer-record')
const {
  ENVELOPE_DOMAIN_PEER_RECORD,
  ENVELOPE_PAYLOAD_TYPE_PEER_RECORD
} = require('./consts')

/**
 * @typedef {import('../../peer-store/types').Address} Address
 * @typedef {import('libp2p-interfaces/src/record/types').Record} Record
 */

/**
 * @implements {Record}
 */
class PeerRecord {
  /**
   * The PeerRecord is used for distributing peer routing records across the network.
   * It contains the peer's reachable listen addresses.
   *
   * @class
   * @param {Object} params
   * @param {PeerId} params.peerId
   * @param {Multiaddr[]} params.multiaddrs - addresses of the associated peer.
   * @param {number} [params.seqNumber] - monotonically-increasing sequence counter that's used to order PeerRecords in time.
   */
  constructor ({ peerId, multiaddrs = [], seqNumber = Date.now() }) {
    this.domain = ENVELOPE_DOMAIN_PEER_RECORD
    this.codec = ENVELOPE_PAYLOAD_TYPE_PEER_RECORD

    this.peerId = peerId
    this.multiaddrs = multiaddrs
    this.seqNumber = seqNumber

    // Cache
    this._marshal = undefined
  }

  /**
   * Marshal a record to be used in an envelope.
   *
   * @returns {Uint8Array}
   */
  marshal () {
    if (this._marshal) {
      return this._marshal
    }

    this._marshal = Protobuf.encode({
      peerId: this.peerId.toBytes(),
      seq: this.seqNumber,
      addresses: this.multiaddrs.map((m) => ({
        multiaddr: m.bytes
      }))
    }).finish()

    return this._marshal
  }

  /**
   * Returns true if `this` record equals the `other`.
   *
   * @param {unknown} other
   * @returns {boolean}
   */
  equals (other) {
    if (!(other instanceof PeerRecord)) {
      return false
    }

    // Validate PeerId
    if (!this.peerId.equals(other.peerId)) {
      return false
    }

    // Validate seqNumber
    if (this.seqNumber !== other.seqNumber) {
      return false
    }

    // Validate multiaddrs
    if (!arrayEquals(this.multiaddrs, other.multiaddrs)) {
      return false
    }

    return true
  }
}

/**
 * Unmarshal Peer Record Protobuf.
 *
 * @param {Uint8Array} buf - marshaled peer record.
 * @returns {PeerRecord}
 */
PeerRecord.createFromProtobuf = (buf) => {
  const peerRecord = Protobuf.decode(buf)

  const peerId = PeerId.createFromBytes(peerRecord.peerId)
  const multiaddrs = (peerRecord.addresses || []).map((a) => new Multiaddr(a.multiaddr))
  const seqNumber = Number(peerRecord.seq)

  return new PeerRecord({ peerId, multiaddrs, seqNumber })
}

PeerRecord.DOMAIN = ENVELOPE_DOMAIN_PEER_RECORD

module.exports = PeerRecord
