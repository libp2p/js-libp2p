export * from './constants.defaults.js'

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#minConnections
 */
export const MIN_CONNECTIONS = 50

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxConnections
 */
export const MAX_CONNECTIONS = 300

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html#maxParallelDials
 */
export const MAX_PARALLEL_DIALS = 100

/**
 * @see https://libp2p.github.io/js-libp2p/interfaces/libp2p.index.unknown.ConnectionManagerInit.html#autoDialPeerRetryThreshold
 */
export const AUTO_DIAL_PEER_RETRY_THRESHOLD = 1000 * 60
