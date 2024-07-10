import type { Connection, MultiaddrConnection } from '../connection/index.js'
import type { TypedEventTarget } from '../event-target.js'
import type { AbortOptions } from '../index.js'
import type { StreamMuxerFactory } from '../stream-muxer/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions, ProgressEvent } from 'progress-events'

export interface ListenerEvents {
  'connection': CustomEvent<Connection>
  'listening': CustomEvent
  'error': CustomEvent<Error>
  'close': CustomEvent
}

export interface Listener extends TypedEventTarget<ListenerEvents> {
  /**
   * Start a listener
   */
  listen(multiaddr: Multiaddr): Promise<void>
  /**
   * Get listen addresses
   */
  getAddrs(): Multiaddr[]
  /**
   * Close listener
   *
   * @returns {Promise<void>}
   */
  close(): Promise<void>
}

export const transportSymbol = Symbol.for('@libp2p/transport')

export interface ConnectionHandler { (connection: Connection): void }

export interface MultiaddrFilter { (multiaddrs: Multiaddr[]): Multiaddr[] }

export interface CreateListenerOptions {
  handler?: ConnectionHandler
  upgrader: Upgrader
}

export interface DialTransportOptions<DialEvents extends ProgressEvent = ProgressEvent> extends AbortOptions, ProgressOptions<DialEvents> {
  upgrader: Upgrader
}

/**
 * A libp2p transport offers dial and listen methods to establish connections.
 */
export interface Transport<DialEvents extends ProgressEvent = ProgressEvent> {
  /**
   * Used to identify the transport
   */
  [Symbol.toStringTag]: string

  /**
   * Used by the isTransport function
   */
  [transportSymbol]: true

  /**
   * Dial a given multiaddr.
   */
  dial(ma: Multiaddr, options: DialTransportOptions<DialEvents>): Promise<Connection>

  /**
   * Create transport listeners.
   */
  createListener(options: CreateListenerOptions): Listener

  /**
   * Takes a list of `Multiaddr`s and returns only addresses that are valid for
   * the transport to listen on
   */
  listenFilter: MultiaddrFilter

  /**
   * Takes a list of `Multiaddr`s and returns only addresses that are vali for
   * the transport to dial
   */
  dialFilter: MultiaddrFilter
}

export function isTransport (other: any): other is Transport {
  return other != null && Boolean(other[transportSymbol])
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

export interface UpgraderOptions<ConnectionUpgradeEvents extends ProgressEvent = ProgressEvent> extends ProgressOptions<ConnectionUpgradeEvents> {
  skipEncryption?: boolean
  skipProtection?: boolean
  muxerFactory?: StreamMuxerFactory

  /**
   * The passed MultiaddrConnection has limits place on duration and/or data
   * transfer amounts so is not expected to be open for very long.
   */
  transient?: boolean
}

export type InboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-inbound-connection'> |
ProgressEvent<'upgrader:multiplex-inbound-connection'>

export type OutboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-outbound-connection'> |
ProgressEvent<'upgrader:multiplex-outbound-connection'>

export interface Upgrader {
  /**
   * Upgrades an outbound connection on `transport.dial`.
   */
  upgradeOutbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<OutboundConnectionUpgradeEvents>): Promise<Connection>

  /**
   * Upgrades an inbound connection on transport listener.
   */
  upgradeInbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<InboundConnectionUpgradeEvents>): Promise<Connection>
}
