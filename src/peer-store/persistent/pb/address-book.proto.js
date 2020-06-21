'use strict'

const protons = require('protons')

const message = `
message Addresses {
  // Address represents a single multiaddr.
  message Address {
    required bytes multiaddr = 1;
  }

  // CertifiedRecord contains a serialized signed PeerRecord used to
  // populate the signedAddrs list.
  message CertifiedRecord {
    // The Seq counter from the signed PeerRecord envelope
    uint64 seq = 1;

    // The serialized bytes of the SignedEnvelope containing the PeerRecord.
    bytes raw = 2;
  }

  // The known multiaddrs.
  repeated Address addrs = 1;

  // The most recently received signed PeerRecord.
  CertifiedRecord certified_record = 2;
}
`

module.exports = protons(message).Addresses
