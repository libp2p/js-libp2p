const minute = 60 * 1000

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
 * Maximum reservations for auto relay
 */
export const DEFAULT_MAX_RESERVATIONS = 1

export const RELAY_DESTINATION_TAG = 'relay-destination'

// circuit v2 connection limits
// https://github.com/libp2p/go-libp2p/blob/master/p2p/protocol/circuitv2/relay/resources.go#L61-L66

// 2 min is the default connection duration
export const DEFAULT_DURATION_LIMIT = 2 * 60 * 1000

// 128k is the default data limit
export const DEFAULT_DATA_LIMIT = BigInt(1 << 17)
