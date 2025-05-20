import type { Connection, ConnectionLimits, MultiaddrConnection } from './connection.js'
import type { TypedEventTarget } from './event-target.js'
import type { AbortOptions, ClearableSignal, ConnectionEncrypter } from './index.js'
import type { StreamMuxerFactory } from './stream-muxer.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions, ProgressEvent } from 'progress-events'

export interface ListenerEvents {
  /**
   * This event signals to the transport manager that the listening addresses
   * have changed and may be emitted at any point and/or multiple times
   */
  listening: CustomEvent

  /**
   * Emitted if listening on an address failed
   */
  error: CustomEvent<Error>

  /**
   * Emitted when the listener has been shut down, has no open connections and
   * will no longer accept new connections
   */
  close: CustomEvent
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
  /**
   * Allows transports to amend announce addresses - to add certificate hashes
   * or other metadata that cannot be known before runtime
   */
  updateAnnounceAddrs(addrs: Multiaddr[]): void
}

export const transportSymbol = Symbol.for('@libp2p/transport')

/**
 * A filter that acts on a list of multiaddrs
 */
export interface MultiaddrFilter {
  (multiaddrs: Multiaddr[]): Multiaddr[]
}

export interface CreateListenerOptions {
  /**
   * The upgrader turns a MultiaddrConnection into a Connection and notifies
   * other libp2p components about a new incoming connection.
   */
  upgrader: Upgrader
}

export interface DialTransportOptions<DialEvents extends ProgressEvent = ProgressEvent> extends Required<AbortOptions>, ProgressOptions<DialEvents> {
  /**
   * The upgrader turns a MultiaddrConnection into a Connection which should be
   * returned by the transport's dial method
   */
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
   * Takes a list of `Multiaddr`s and returns only addresses that are valid for
   * the transport to dial
   */
  dialFilter: MultiaddrFilter
}

/**
 * Used to disambiguate transport implementations
 */
export function isTransport (other?: any): other is Transport {
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

/**
 * Options accepted by the upgrader during connection establishment
 */
export interface UpgraderOptions<ConnectionUpgradeEvents extends ProgressEvent = ProgressEvent> extends ProgressOptions<ConnectionUpgradeEvents>, Required<AbortOptions> {
  /**
   * If true the invoking transport is expected to implement it's own encryption
   * and an encryption protocol will not attempted to be negotiated via
   * multi-stream select
   *
   * @default false
   */
  skipEncryption?: boolean

  /**
   * If true no connection protection will be performed on the connection.
   */
  skipProtection?: boolean

  /**
   * By default a stream muxer protocol will be negotiated via multi-stream
   * select after an encryption protocol has been agreed on.
   *
   * If a transport provides it's own stream muxing facility pass a muxer
   * factory instance here to skip muxer negotiation.
   */
  muxerFactory?: StreamMuxerFactory

  /**
   * If the connection is to have limits applied to it, pass them here
   */
  limits?: ConnectionLimits

  /**
   * Multi-stream select is a initiator/responder protocol. By default a
   * connection returned from `upgrader.upgradeOutbound` will be the initiator
   * and one returned from `upgrader.upgradeInbound` will be the responder.
   *
   * Pass a value here to override the default.
   */
  initiator?: boolean
}

export type InboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-inbound-connection'> |
ProgressEvent<'upgrader:multiplex-inbound-connection'>

export type OutboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-outbound-connection'> |
ProgressEvent<'upgrader:multiplex-outbound-connection'>

export interface Upgrader {
  /**
   * Upgrades an outbound connection created by the `dial` method of a transport
   */
  upgradeOutbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<OutboundConnectionUpgradeEvents>): Promise<Connection>

  /**
   * Upgrades an inbound connection received by a transport listener and
   * notifies other libp2p components about the new connection
   */
  upgradeInbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<InboundConnectionUpgradeEvents>): Promise<void>

  /**
   * Used by transports that perform part of the upgrade process themselves and
   * do some async work. This allows configuring inbound upgrade timeouts from a
   * single location.
   *
   * Regular transports should just pass the signal from their shutdown
   * controller to `upgradeInbound`.
   */
  createInboundAbortSignal (signal: AbortSignal): ClearableSignal

  /**
   * Returns configured stream muxers
   */
  getStreamMuxers (): Map<string, StreamMuxerFactory>

  /**
   * Returns configured connection encrypters
   */
  getConnectionEncrypters (): Map<string, ConnectionEncrypter>
}
