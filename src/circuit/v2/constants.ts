export const RELAYED_TAG = 'relayed'

// circuit v2 connection limits
// https://github.com/libp2p/go-libp2p/blob/master/p2p/protocol/circuitv2/relay/resources.go#L61-L66

// 2 min is the default connection duration
export const DEFAULT_DURATION_LIMIT = 2 * 60 * 1000

// 128k is the default data limit
export const DEFAULT_DATA_LIMIT = 1 << 17
