/**
 * RelayConfig configures the circuit v2 relay transport.
 */
export interface RelayConfig {
  /**
   * Enable dialing a client over a relay and receiving relayed connections.
   * This in itself does not enable the node to act as a relay.
   */
  enabled: boolean
  advertise: RelayAdvertiseConfig
  hop: HopConfig
  reservationManager: RelayReservationManagerConfig
}

/**
 * RelayReservationManagerConfig allows the node to automatically listen
 * on any discovered relays upto a specified maximum.
 */
export interface RelayReservationManagerConfig {
  /**
   * enable or disable autorelay (default: false)
   */
  enabled?: boolean

  /**
   * maximum number of relays to listen (default: 1)
   */
  maxReservations?: number
}

/**
 * Configures using the node as a HOP relay
 */
export interface HopConfig {
  /**
   * If true this node will function as a limited relay (default: false)
   */
  enabled?: boolean

  /**
   * timeout for hop requests to complete
   */
  timeout: number

  /**
   * If false, no connection limits will be applied to relayed connections (default: true)
   */
  applyConnectionLimits?: boolean

  /**
   * Limits to apply to incoming relay connections - relayed connections will be closed if
   * these limits are exceeded.
   */
  limit?: {
    /**
     * How long to relay a connection for in milliseconds (default: 2m)
     */
    duration?: number

    /**
     * How many bytes to allow to be transferred over a relayed connection (default: 128k)
     */
    data?: bigint
  }
}

export interface RelayAdvertiseConfig {
  bootDelay?: number
  enabled?: boolean
  ttl?: number
}

export { Relay } from './relay.js'
