'use strict'

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const Record = require('libp2p-interfaces/src/record')
const arrayEquals = require('libp2p-utils/src/array-equals')

const Protobuf = require('./peer-record.proto')
const {
  ENVELOPE_DOMAIN_PEER_RECORD,
  ENVELOPE_PAYLOAD_TYPE_PEER_RECORD
} = require('./consts')

/**
 * The PeerRecord is used for distributing peer routing records across the network.
 * It contains the peer's reachable listen addresses.
 */
class PeerRecord extends Record {
  /**
   * @constructor
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {Array<multiaddr>} params.multiaddrs addresses of the associated peer.
   * @param {number} [params.seqNumber] monotonically-increasing sequence counter that's used to order PeerRecords in time.
   */
  constructor ({ peerId, multiaddrs = [], seqNumber = Date.now() }) {
    super(ENVELOPE_DOMAIN_PEER_RECORD, ENVELOPE_PAYLOAD_TYPE_PEER_RECORD)

    this.peerId = peerId
    this.multiaddrs = multiaddrs
    this.seqNumber = seqNumber

    // Cache
    this._marshal = undefined
  }

  /**
   * Marshal a record to be used in an envelope.
   * @return {Uint8Array}
   */
  marshal () {
    if (this._marshal) {
      return this._marshal
    }

    this._marshal = Protobuf.encode({
      peer_id: this.peerId.toBytes(),
      seq: this.seqNumber,
      addresses: this.multiaddrs.map((m) => ({
        multiaddr: m.bytes
      }))
    })

    return this._marshal
  }

  /**
   * Returns true if `this` record equals the `other`.
   * @param {Record} other
   * @return {boolean}
   */
  equals (other) {
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
 * @param {Uint8Array} buf marshaled peer record.
 * @return {PeerRecord}
 */
PeerRecord.createFromProtobuf = (buf) => {
  // Decode
  const peerRecord = Protobuf.decode(buf)

  const peerId = PeerId.createFromBytes(peerRecord.peer_id)
  const multiaddrs = (peerRecord.addresses || []).map((a) => multiaddr(a.multiaddr))
  const seqNumber = peerRecord.seq

  return new PeerRecord({ peerId, multiaddrs, seqNumber })
}

PeerRecord.DOMAIN = ENVELOPE_DOMAIN_PEER_RECORD

module.exports = PeerRecord
