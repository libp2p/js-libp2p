import type { Connection, MultiaddrConnection } from '@libp2p/interface-connection'
import type { StreamMuxerFactory } from '@libp2p/interface-stream-muxer'
import type { AbortOptions } from '@libp2p/interfaces'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex } from 'it-stream-types'

export const symbol = Symbol.for('@libp2p/transport')

export interface ConnectionHandler { (connection: Connection): void }

export interface MultiaddrFilter { (multiaddrs: Multiaddr[]): Multiaddr[] }

export interface CreateListenerOptions {
  handler?: ConnectionHandler
  upgrader: Upgrader
}

export interface DialOptions extends AbortOptions {
  upgrader: Upgrader
}

/**
 * A libp2p transport is understood as something that offers a dial and listen interface to establish connections.
 */
export interface Transport {
  /**
   * Used to identify the transport
   */
  [Symbol.toStringTag]: string

  /**
   * Used by the isTransport function
   */
  [symbol]: true

  /**
   * Dial a given multiaddr.
   */
  dial: (ma: Multiaddr, options: DialOptions) => Promise<Connection>

  /**
   * Create transport listeners.
   */
  createListener: (options: CreateListenerOptions) => Listener

  /**
   * Takes a list of `Multiaddr`s and returns only valid addresses for the transport
   */
  filter: MultiaddrFilter
}

export interface ListenerEvents {
  'connection': CustomEvent<Connection>
  'listening': CustomEvent
  'error': CustomEvent<Error>
  'close': CustomEvent
}

export interface Listener extends EventEmitter<ListenerEvents> {
  /**
   * Start a listener
   */
  listen: (multiaddr: Multiaddr) => Promise<void>
  /**
   * Get listen addresses
   */
  getAddrs: () => Multiaddr[]
  /**
   * Close listener
   *
   * @returns {Promise<void>}
   */
  close: () => Promise<void>
}

export interface UpgraderOptions {
  skipEncryption?: boolean
  skipProtection?: boolean
  muxerFactory?: StreamMuxerFactory
}

export interface Upgrader {
  /**
   * Upgrades an outbound connection on `transport.dial`.
   */
  upgradeOutbound: (maConn: MultiaddrConnection, opts?: UpgraderOptions) => Promise<Connection>

  /**
   * Upgrades an inbound connection on transport listener.
   */
  upgradeInbound: (maConn: MultiaddrConnection, opts?: UpgraderOptions) => Promise<Connection>
}

export interface ProtocolHandler {
  (stream: Duplex<Uint8Array>, connection: Connection): void
}

export function isTransport (other: any): other is Transport {
  return other != null && Boolean(other[symbol])
}

export interface TransportManager {
  add: (transport: Transport) => void
  dial: (ma: Multiaddr, options?: any) => Promise<Connection>
  getAddrs: () => Multiaddr[]
  getTransports: () => Transport[]
  getListeners: () => Listener[]
  transportForMultiaddr: (ma: Multiaddr) => Transport | undefined
  listen: (addrs: Multiaddr[]) => Promise<void>
  remove: (key: string) => Promise<void>
  removeAll: () => Promise<void>
}

/**
 * Enum Transport Manager Fault Tolerance values
 */
export enum FaultTolerance {
  /**
   * should be used for failing in any listen circumstance
   */
  FATAL_ALL = 0,

  /**
   * should be used for not failing when not listening
   */
  NO_FATAL
}
