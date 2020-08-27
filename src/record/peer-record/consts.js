'use strict'

const multicodec = require('multicodec')

// The domain string used for peer records contained in a Envelope.
module.exports.ENVELOPE_DOMAIN_PEER_RECORD = multicodec.getName(multicodec.LIBP2P_PEER_RECORD)

// The type hint used to identify peer records in a Envelope.
// Defined in https://github.com/multiformats/multicodec/blob/master/table.csv
// with name "libp2p-peer-record"
module.exports.ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = Uint8Array.from([3, 1])
