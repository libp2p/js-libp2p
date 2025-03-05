/**
 * Protocol Constants
 */
export const PROTOCOL_NAME = 'http'
export const PROTOCOL_VERSION = '1.1' //Compliance with spec requires http version number not package version
export const DEFAULT_MAX_INBOUND_STREAMS = 100
export const DEFAULT_MAX_OUTBOUND_STREAMS = 100
export const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * WebSocket Ready States
 */
export const WEBSOCKET_CONNECTING = 0
export const WEBSOCKET_OPEN = 1
export const WEBSOCKET_CLOSING = 2
export const WEBSOCKET_CLOSED = 3

/**
 * Default WebSocket Configuration
 */
export const DEFAULT_WEBSOCKET_KEEP_ALIVE_INTERVAL = 0 // Default: disabled
export const DEFAULT_WEBSOCKET_PING_TIMEOUT = 10000 // 10 seconds
export const DEFAULT_WEBSOCKET_FRAGMENTATION_THRESHOLD = 16384 // 16KB
