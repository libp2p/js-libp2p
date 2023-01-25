export interface RelayConfig {
  enabled: boolean
  advertise: RelayAdvertiseConfig
  hop: HopConfig
  service: CircuitServiceConfig
}

/**
 * CircuitServiceConfig allows the node to automatically listen
 * on any discovered relays upto a specified maximum.
 */
export interface CircuitServiceConfig {
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
