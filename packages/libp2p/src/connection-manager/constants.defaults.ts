/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#dialTimeout
 */
export const DIAL_TIMEOUT = 30e3

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#inboundUpgradeTimeout
 */
export const INBOUND_UPGRADE_TIMEOUT = 30e3

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxPeerAddrsToDial
 */
export const MAX_PEER_ADDRS_TO_DIAL = 25

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#autoDialInterval
 */
export const AUTO_DIAL_INTERVAL = 5000

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#autoDialConcurrency
 */
export const AUTO_DIAL_CONCURRENCY = 25

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#autoDialPriority
 */
export const AUTO_DIAL_PRIORITY = 0

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#autoDialMaxQueueLength
 */
export const AUTO_DIAL_MAX_QUEUE_LENGTH = 100

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/libp2p.index.unknown.ConnectionManagerInit.html#autoDialDiscoveredPeersDebounce
 */
export const AUTO_DIAL_DISCOVERED_PEERS_DEBOUNCE = 10

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#inboundConnectionThreshold
 */
export const INBOUND_CONNECTION_THRESHOLD = 5

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxIncomingPendingConnections
 */
export const MAX_INCOMING_PENDING_CONNECTIONS = 10

/**
 * Store as part of the peer store metadata for a given peer, the value for this
 * key is a timestamp of the last time a dial attempted failed with the relevant
 * peer stored as a string.
 *
 * Used to insure we do not endlessly try to auto dial peers we have recently
 * failed to dial.
 */
export const LAST_DIAL_FAILURE_KEY = 'last-dial-failure'
