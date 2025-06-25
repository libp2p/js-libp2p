/**
 * The prefix to use in the protocol
 */
export const PROTOCOL_PREFIX = 'libp2p'

/**
 * The name to use in the protocol
 */
export const PROTOCOL_NAME = 'autonat'

/**
 * The version to use in the protocol
 */
export const PROTOCOL_VERSION = '2'
export const TIMEOUT = 30_000
export const MAX_INBOUND_STREAMS = 2
export const MAX_OUTBOUND_STREAMS = 20
export const DEFAULT_CONNECTION_THRESHOLD = 80
export const MAX_MESSAGE_SIZE = 8192

export const DIAL_REQUEST = 'dial-request'
export const DIAL_BACK = 'dial-back'
export const MAX_DIAL_DATA_BYTES = 200n * 1024n
export const DIAL_DATA_CHUNK_SIZE = 4096
