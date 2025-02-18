import type { Connection, ConnectionLimits, MultiaddrConnection } from './connection.js'
import type { TypedEventTarget } from './event-target.js'
import type { AbortOptions } from './index.js'
import type { StreamMuxerFactory } from './stream-muxer.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions, ProgressEvent } from 'progress-events'

/**
 * This defines the events that can be emitted by a listener.
 *  
 * @example
 *
 * ```TypeScript
 * const listener = transport.createListener()
 * const event: ListenerEvents = listener.addEventListener('listening', () => {
 *   console.log('listening')
 * })
 * ```
 */
export interface ListenerEvents {
  /**
   * This event signals to the transport manager that the listening addresses
   * have changed and may be emitted at any point and/or multiple times
   */
  'listening': CustomEvent

  /**
   * Emitted if listening on an address failed
   */
  'error': CustomEvent<Error>

  /**
   * Emitted when the listener has been shut down, has no open connections and
   * will no longer accept new connections
   */
  'close': CustomEvent
}

/**
 * This defines the listener object.
 *
 * @example
 * ```TypeScript
 * const listener = transport.createListener()
 * await listener.listen(multiaddr)
 * const addresses = listener.getAddrs()
 * await listener.close()
 * ```
 */
export interface Listener extends TypedEventTarget<ListenerEvents> {
  /**
   * Start a listener
   * 
   * @param multiaddr - The `Multiaddr` to listen on
   * 
   * @returns A promise that resolves when the listener is started
   * 
   * @example
   *
   * ```TypeScript
   * await listener.listen(multiaddr)
   * ```
   */
  listen(multiaddr: Multiaddr): Promise<void>
  /**
   * Get listen addresses
   * 
   * @returns The listen addresses
   * 
   * @example
   *
   * ```TypeScript
   * const addresses = listener.getAddrs()
   * ```
   */
  getAddrs(): Multiaddr[]
  /**
   * Close listener
   * 
   * @returns A promise that resolves when the listener is closed
   * 
   * @example
   * 
   * ```TypeScript
   * await listener.close()
   * ```
   */
  close(): Promise<void>
}

/**
 * This is the symbol for the transport.
 */
export const transportSymbol = Symbol.for('@libp2p/transport')

/**
 * A function type used for filtering an array of `Multiaddr` objects.
 * 
 * This function takes an array of `Multiaddr` objects as input and returns a subset of them, 
 * based on specific filtering criteria (e.g., protocol type).
 *
 * @param multiaddrs - An array of `Multiaddr` objects to filter.
 * @returns A filtered array of `Multiaddr` objects that match the criteria.
 * 
 * @example
 * 
 * ```TypeScript
 * const filter: MultiaddrFilter = (multiaddrs) => 
 *   multiaddrs.filter((ma) => ma.protoName === 'tcp')
 * 
 * const filteredAddrs = filter(multiaddrs)
 * console.log(filteredAddrs)
 * // Output: Only Multiaddrs with 'protoName' === 'tcp'
 * ```
 */
export interface MultiaddrFilter {
  (multiaddrs: Multiaddr[]): Multiaddr[]
}

/**
 * This is the interface for the create listener options.
 * 
 * @example
 *
 * ```TypeScript
 * const listener = transport.createListener()
 * const options: CreateListenerOptions = { upgrader: listener.upgrader }
 * ```
 */
export interface CreateListenerOptions {
  /**
   * The upgrader turns a MultiaddrConnection into a Connection and notifies
   * other libp2p components about a new incoming connection.
   */
  upgrader: Upgrader
}

/**
 * This is the interface for the dial transport options.
 * 
 * @example
 *
 * ```TypeScript
 * const options: DialTransportOptions = { upgrader }
 * ```
 */
export interface DialTransportOptions<DialEvents extends ProgressEvent = ProgressEvent> extends AbortOptions, ProgressOptions<DialEvents> {
  /**
   * The upgrader turns a MultiaddrConnection into a Connection which should be
   * returned by the transport's dial method
   * 
   * This object implements the `Upgrader` interface which provides methods to:
   * - `upgradeInbound`: Upgrade an incoming connection.
   * - `upgradeOutbound`: Upgrade an outgoing connection.
   *
   * See the `Upgrader` interface documentation for more details.
   */
  upgrader: Upgrader
}

/**
 * A libp2p transport offers dial and listen methods to establish connections.
 * 
 * @example
 *
 * ```TypeScript
 * const transport: Transport = { listenFilter, dialFilter }
 * await transport.dial(ma)
 * const listener = transport.createListener({ upgrader })
 * ```
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
   * 
   * @param ma - The `Multiaddr` to dial
   * @param options - The options for the dial.
   * 
   * @returns A promise that resolves to the `Connection`
   * 
   * @example
   *
   * ```TypeScript
   * const connection = await transport.dial(multiaddr)
   * ```
   */
  dial(ma: Multiaddr, options: DialTransportOptions<DialEvents>): Promise<Connection>

  /**
   * Create transport listeners.
   * 
   * @param options - The options for the listener.
   * 
   * @returns A promise that resolves to the `Listener`
   * 
   * @example
   *
   * ```TypeScript
   * const listener = transport.createListener({ upgrader })
   * ```
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
 * This function checks if the given object is a transport.
 * 
 * @param other - The object to check.
 * @returns `true` if the object is a transport, `false` otherwise.
 * 
 * @example
 *
 * ```TypeScript
 * const isTransport = isTransport(transport)
 * ```
 */
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

/**
 * This is the interface for the upgrader options.
 * 
 * @example
 *
 * ```TypeScript
 * const upgraderOptions: UpgraderOptions = { skipEncryption: true, limits: { bytes: 1024, seconds: 10 } }
 * ```
 */
export interface UpgraderOptions<ConnectionUpgradeEvents extends ProgressEvent = ProgressEvent> extends ProgressOptions<ConnectionUpgradeEvents>, AbortOptions {
  /**
   * Skips encryption (optional)
   */
  skipEncryption?: boolean
  /**
   * Skips protection (optional)
   */
  skipProtection?: boolean
  /**
   * The muxer factory (optional)
   */
  muxerFactory?: StreamMuxerFactory
  /**
   * The connection limits (optional)
   */
  limits?: ConnectionLimits
  initiator?: boolean
}

/**
 * This is the type for the inbound connection upgrade events.
 * 
 * @example
 *
 * ```TypeScript
 * const events: InboundConnectionUpgradeEvents = { type: 'upgrader:encrypt-inbound-connection' }
 */
export type InboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-inbound-connection'> |
ProgressEvent<'upgrader:multiplex-inbound-connection'>

/**
 * This is the type for the outbound connection upgrade events.
 * 
 * @example
 *
 * ```TypeScript
 * const events: OutboundConnectionUpgradeEvents = { type: 'upgrader:encrypt-outbound-connection' }
 */
export type OutboundConnectionUpgradeEvents =
ProgressEvent<'upgrader:encrypt-outbound-connection'> |
ProgressEvent<'upgrader:multiplex-outbound-connection'>

/**
 * This is the interface for the upgrader.
 * 
 * @example
 *
 * ```TypeScript
 * const upgrader: Upgrader = { upgradeOutbound, upgradeInbound }
 * ```
 */
export interface Upgrader {
  /**
   * Upgrades an outbound connection created by the `dial` method of a transport
   * 
   * @param maConn - The `MultiaddrConnection` to upgrade.
   * @param opts - The options for the upgrader.
   * 
   * @example
   *
   * ```TypeScript
   * const connection = await upgrader.upgradeOutbound(maConn)
   * ```
   */
  upgradeOutbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<OutboundConnectionUpgradeEvents>): Promise<Connection>

  /**
   * Upgrades an inbound connection received by a transport listener and
   * notifies other libp2p components about the new connection
   * 
   * @param maConn - The `MultiaddrConnection` to upgrade.
   * @param opts - The options for the upgrader.
   * 
   * @example
   *
   * ```TypeScript
   * await upgrader.upgradeInbound(maConn)
   * ```
   */
  upgradeInbound(maConn: MultiaddrConnection, opts?: UpgraderOptions<InboundConnectionUpgradeEvents>): Promise<void>
}
