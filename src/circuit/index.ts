export interface RelayConfig {
  enabled: boolean
  advertise: RelayAdvertiseConfig
  hop: HopConfig
  autoRelay: AutoRelayConfig
}

export interface AutoRelayConfig {
  enabled?: boolean

  /**
   * maximum number of relays to listen
   */
  maxListeners: number
}

export interface HopConfig {
  enabled?: boolean
  active?: boolean
  timeout: number
}

export interface RelayAdvertiseConfig {
  bootDelay?: number
  enabled?: boolean
  ttl?: number
}

export { Relay } from './relay.js'
