import type { AbortOptions, Connection, Listener, Transport, TransportManagerDialProgressEvents } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'

/**
 * @packageDocumentation
 *
 * The `TransportManager` module handles the management of transport protocols in a libp2p network.
 * It is responsible for adding, removing, and managing transport connections used for peer communication.
 *
 * @example
 * ```typescript
 * const transportManager = libp2p.transportManager
 *
 * await transportManager.listen([multiaddr('/ip4/127.0.0.1/tcp/4001')])
 * console.log('Listening on:', transportManager.getAddrs())
 * ```
 */

/**
 * Options for dialing a connection using the `TransportManager`.
 */
export interface TransportManagerDialOptions extends AbortOptions, ProgressOptions<TransportManagerDialProgressEvents> {

}
/**
 * The `TransportManager` interface manages available transports for dialing and listening in a libp2p node.
 */

export interface TransportManager {
  /**
   * Add a transport to the transport manager.
   * 
   * @param transport - The transport instance to be added.
   *
   * @example
   * ```typescript
   * transportManager.add(myTransport)
   * ```
   */
  add(transport: Transport): void

  /**
   * Dial a multiaddr. Connections returned by this method will not be tracked
   * by the connection manager so can cause memory leaks. If you need to dial
   * a multiaddr, you may want to call openConnection on the connection manager
   * instead.
   * 
   * @param ma - The multiaddr to dial.
   * @param options - Optional dial options.
   * @returns A promise that resolves to a `Connection` object.
   *
   * @example
   * ```typescript
   * const conn = await transportManager.dial(multiaddr('/ip4/192.168.1.1/tcp/4001'))
   * ```
   */
  dial(ma: Multiaddr, options?: TransportManagerDialOptions): Promise<Connection>

  /**
   * Return all addresses currently being listened on
   * @returns An array of `Multiaddr` objects.
   *
   * @example
   * ```typescript
   * console.log(transportManager.getAddrs())
   * ```
   */
  getAddrs(): Multiaddr[]

  /**
   * Return all registered transports
   * 
   * @returns An array of `Transport` instances.
   *
   * @example
   * ```typescript
   * console.log(transportManager.getTransports())
   * ```
   */
  getTransports(): Transport[]

  /**
   * Return all listeners
   * 
   * @returns An array of `Listener` instances.
   */
  getListeners(): Listener[]

  /**
   * Get the transport to dial a given multiaddr, if one has been configured
   * 
   * @param ma - The target multiaddr.
   * @returns A `Transport` instance if available, otherwise `undefined`.
   *
   * @example
   * ```typescript
   * const transport = transportManager.dialTransportForMultiaddr(multiaddr('/ip4/192.168.1.1/tcp/4001'))
   * ```
   */
  dialTransportForMultiaddr(ma: Multiaddr): Transport | undefined

  /**
   * Get the transport to listen on a given multiaddr, if one has been
   * configured
   * 
   * @param ma - The target multiaddr.
   * @returns A `Transport` instance if available, otherwise `undefined`.
   */
  listenTransportForMultiaddr(ma: Multiaddr): Transport | undefined

  /**
   * Listen on the passed multiaddrs
   * @param addrs - An array of multiaddrs to listen on.
   * @returns A promise that resolves once the transport is actively listening.
   *
   * @example
   * ```typescript
   * await transportManager.listen([multiaddr('/ip4/127.0.0.1/tcp/4001')])
   * ```
   */
  listen(addrs: Multiaddr[]): Promise<void>

  /**
   * Remove a previously configured transport
   * @param key - The transport key or identifier.
   * @returns A promise that resolves once the transport is removed.
   *
   * @example
   * ```typescript
   * await transportManager.remove('tcp')
   * ```
   */
  remove(key: string): Promise<void>

  /**
   * Remove all transports
   * 
   * @returns A promise that resolves once all transports are removed.
   *
   * @example
   * ```typescript
   * await transportManager.removeAll()
   * ```
   */
  removeAll(): Promise<void>
}
