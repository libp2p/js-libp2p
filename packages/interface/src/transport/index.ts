import type { Connection, MultiaddrConnection } from '../connection/index.js'
import type { EventEmitter } from '../events.js'
import type { AbortOptions } from '../index.js'
import type { StreamMuxerFactory } from '../stream-muxer/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'

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

export function isTransport (other: any): other is Transport {
  return other != null && Boolean(other[symbol])
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

export interface UpgraderOptions {
  skipEncryption?: boolean
  skipProtection?: boolean
  muxerFactory?: StreamMuxerFactory

  /**
   * The passed MultiaddrConnection has limits place on duration and/or data
   * transfer amounts so is not expected to be open for very long.
   */
  transient?: boolean
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
