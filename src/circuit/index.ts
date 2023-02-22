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
   *
   */
  enabled?: boolean
  /**
   * timeout for hop requests to complete
   */
  timeout: number
}

export interface RelayAdvertiseConfig {
  bootDelay?: number
  enabled?: boolean
  ttl?: number
}

export { Relay } from './relay.js'
