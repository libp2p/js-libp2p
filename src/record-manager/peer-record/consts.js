'use strict'

// const { Buffer } = require('buffer')
const multicodec = require('multicodec')

// The domain string used for peer records contained in a Envelope.
module.exports.ENVELOPE_DOMAIN_PEER_RECORD = 'libp2p-peer-record'

// The type hint used to identify peer records in a Envelope.
// Defined in https://github.com/multiformats/multicodec/blob/master/table.csv
// with name "libp2p-peer-record"
// TODO
// const b = Buffer.aloc(2)
// b.writeInt16BE(multicodec.LIBP2P_PEER_RECORD)
// module.exports.ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = b

// const ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = Buffer.aloc(2)
module.exports.ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = multicodec.LIBP2P_PEER_RECORD
