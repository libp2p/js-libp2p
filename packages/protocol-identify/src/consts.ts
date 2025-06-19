export const PROTOCOL_VERSION = 'ipfs/0.1.0' // deprecated
export const MULTICODEC_IDENTIFY = '/ipfs/id/1.0.0' // deprecated
export const MULTICODEC_IDENTIFY_PUSH = '/ipfs/id/push/1.0.0' // deprecated

export const IDENTIFY_PROTOCOL_VERSION = '0.1.0'
export const MULTICODEC_IDENTIFY_PROTOCOL_NAME = 'id'
export const MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME = 'id/push'
export const MULTICODEC_IDENTIFY_PROTOCOL_VERSION = '1.0.0'
export const MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION = '1.0.0'

// https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L52
export const MAX_IDENTIFY_MESSAGE_SIZE = 1024 * 8

// https://github.com/libp2p/go-libp2p/blob/0385ec924bad172f74a74db09939e97c079b1420/p2p/protocol/identify/id.go#L47C7-L47C25
export const MAX_PUSH_CONCURRENCY = 32

export const PUSH_DEBOUNCE_MS = 1_000
