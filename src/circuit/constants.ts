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
