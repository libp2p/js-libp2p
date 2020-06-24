'use strict'

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const Record = require('libp2p-interfaces/src/record')

const Protobuf = require('./peer-record.proto')
const {
  ENVELOPE_DOMAIN_PEER_RECORD,
  ENVELOPE_PAYLOAD_TYPE_PEER_RECORD
} = require('./consts')

const arraysAreEqual = (a, b) => a.length === b.length && a.sort().every((item, index) => b[index].equals(item))

/**
 * The PeerRecord is responsible for TODOTODOTRDO
 */
class PeerRecord extends Record {
  /**
   * @constructor
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {Array<multiaddr>} params.multiaddrs public addresses of the peer this record pertains to.
   * @param {number} [params.seqNumber] monotonically-increasing sequence counter that's used to order PeerRecords in time.
   */
  constructor ({ peerId, multiaddrs = [], seqNumber = Date.now() }) {
    // TODO: verify domain/payload type
    super(ENVELOPE_DOMAIN_PEER_RECORD, ENVELOPE_PAYLOAD_TYPE_PEER_RECORD)

    this.peerId = peerId
    this.multiaddrs = multiaddrs
    this.seqNumber = seqNumber

    // Cache
    this._marshal = undefined
  }

  /**
   * Marshal a record to be used in an envelope.
   * @return {Buffer}
   */
  marshal () {
    if (this._marshal) {
      return this._marshal
    }

    this._marshal = Protobuf.encode({
      peer_id: this.peerId.toBytes(),
      seq: this.seqNumber,
      addresses: this.multiaddrs.map((m) => ({
        multiaddr: m.buffer
      }))
    })

    return this._marshal
  }

  /**
   * Verifies if the other PeerRecord is identical to this one.
   * @param {Record} other
   * @return {boolean}
   */
  isEqual (other) {
    // Validate PeerId
    if (!this.peerId.equals(other.peerId)) {
      return false
    }

    // Validate seqNumber
    if (this.seqNumber !== other.seqNumber) {
      return false
    }

    // Validate multiaddrs
    if (this.multiaddrs.length !== other.multiaddrs.length || !arraysAreEqual(this.multiaddrs, other.multiaddrs)) {
      return false
    }

    return true
  }
}

/**
 * Unmarshal Peer Record Protobuf.
 * @param {Buffer} buf marshaled peer record.
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

module.exports = PeerRecord
