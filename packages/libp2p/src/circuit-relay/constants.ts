const second = 1000
const minute = 60 * second

/**
 * Delay before HOP relay service is advertised on the network
 */
export const ADVERTISE_BOOT_DELAY = 15 * minute

/**
 * Delay Between HOP relay service advertisements on the network
 */
export const ADVERTISE_TTL = 30 * minute

/**
 * Multicodec code
 */
export const CIRCUIT_PROTO_CODE = 290

/**
 * Relay HOP relay service namespace for discovery
 */
export const RELAY_RENDEZVOUS_NS = '/libp2p/relay'

/**
 * The maximum number of relay reservations the relay server will accept
 */
export const DEFAULT_MAX_RESERVATION_STORE_SIZE = 15

/**
 * How often to check for reservation expiry
 */
export const DEFAULT_MAX_RESERVATION_CLEAR_INTERVAL = 300 * second

/**
 * How often to check for reservation expiry
 */
export const DEFAULT_MAX_RESERVATION_TTL = 2 * 60 * minute

export const DEFAULT_RESERVATION_CONCURRENCY = 1

export const RELAY_SOURCE_TAG = 'circuit-relay-source'

export const RELAY_TAG = 'circuit-relay-relay'

// circuit v2 connection limits
// https://github.com/libp2p/go-libp2p/blob/master/p2p/protocol/circuitv2/relay/resources.go#L61-L66

// 2 min is the default connection duration
export const DEFAULT_DURATION_LIMIT = 2 * minute

// 128k is the default data limit
export const DEFAULT_DATA_LIMIT = BigInt(1 << 17)

/**
 * The hop protocol
 */
export const RELAY_V2_HOP_CODEC = '/libp2p/circuit/relay/0.2.0/hop'

/**
 * the stop protocol
 */
export const RELAY_V2_STOP_CODEC = '/libp2p/circuit/relay/0.2.0/stop'

/**
 * Hop messages must be exchanged inside this timeout
 */
export const DEFAULT_HOP_TIMEOUT = 30 * second

/**
 * How long to wait before starting to advertise the relay service
 */
export const DEFAULT_ADVERT_BOOT_DELAY = 30 * second
