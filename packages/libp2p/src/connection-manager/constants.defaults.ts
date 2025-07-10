/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#dialTimeout
 */
export const DIAL_TIMEOUT = 10_000

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#inboundUpgradeTimeout
 */
export const INBOUND_UPGRADE_TIMEOUT = 10_000

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#protocolNegotiationTimeout
 */
export const PROTOCOL_NEGOTIATION_TIMEOUT = 10_000

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxPeerAddrsToDial
 */
export const MAX_PEER_ADDRS_TO_DIAL = 25

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#inboundConnectionThreshold
 */
export const INBOUND_CONNECTION_THRESHOLD = 5

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxIncomingPendingConnections
 */
export const MAX_INCOMING_PENDING_CONNECTIONS = 10

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxParallelReconnects
 */
export const MAX_PARALLEL_RECONNECTS = 5

/**
 * Store as part of the peer store metadata for a given peer, the value for this
 * key is a timestamp of the last time a dial attempt failed with the timestamp
 * stored as a string.
 *
 * Used to insure we do not endlessly try to auto dial peers we have recently
 * failed to dial.
 */
export const LAST_DIAL_FAILURE_KEY = 'last-dial-failure'

/**
 * Store as part of the peer store metadata for a given peer, the value for this
 * key is a timestamp of the last time a dial attempt succeeded with the
 * timestamp stored as a string.
 */
export const LAST_DIAL_SUCCESS_KEY = 'last-dial-success'

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxDialQueueLength
 */
export const MAX_DIAL_QUEUE_LENGTH = 500

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxRecursiveDepth
 */
export const MAX_RECURSIVE_DEPTH = 32
