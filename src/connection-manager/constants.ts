
/**
 * How long in ms a dial attempt is allowed to take
 */
export const DIAL_TIMEOUT = 30e3

/**
 * How long in ms an inbound connection upgrade is allowed to take
 */
export const INBOUND_UPGRADE_TIMEOUT = 30e3

/**
 * Maximum allowed concurrent dials
 */
export const MAX_PARALLEL_DIALS = 100

/**
 * Maximum number of allowed addresses to attempt to dial per peer
 */
export const MAX_PEER_ADDRS_TO_DIAL = 25

/**
 * How many peer addresses to dial at once
 */
export const MAX_DIALS_PER_PEER = 10

/**
 * Minimum required number of connections before this node begins to
 * auto-dial peers from the peer book to ensure good connectivity
 */
export const MIN_CONNECTIONS = 50

/**
 * Maximum number of connections before this node begins to prune connections
 * to preserve resources
 */
export const MAX_CONNECTIONS = 300

/**
 * How many peers to auto dial in parallel
 */
export const AUTO_DIAL_CONCURRENCY = 25

/**
 * What priority to use when auto-dialling. Should be set low to allow
 * user-initiated dials to take precedence.
 */
export const AUTO_DIAL_PRIORITY = 0

/**
 *
 */
export const INBOUND_CONNECTION_THRESHOLD = 5

export const MAX_INCOMING_PENDING_CONNECTIONS = 10
