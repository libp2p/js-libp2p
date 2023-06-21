
// The domain string used for peer records contained in a Envelope.
export const ENVELOPE_DOMAIN_PEER_RECORD = 'libp2p-peer-record'

// The type hint used to identify peer records in a Envelope.
// Defined in https://github.com/multiformats/multicodec/blob/master/table.csv
// with name "libp2p-peer-record"
export const ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = Uint8Array.from([3, 1])
