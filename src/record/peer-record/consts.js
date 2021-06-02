'use strict'

// The domain string used for peer records contained in a Envelope.
const domain = 'libp2p-peer-record'

// The type hint used to identify peer records in a Envelope.
// Defined in https://github.com/multiformats/multicodec/blob/master/table.csv
// with name "libp2p-peer-record"
const payloadType = Uint8Array.from([3, 1])

module.exports = {
  ENVELOPE_DOMAIN_PEER_RECORD: domain,
  ENVELOPE_PAYLOAD_TYPE_PEER_RECORD: payloadType
}
