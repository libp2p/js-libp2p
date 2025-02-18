import type { AbortOptions, Connection, Listener, Transport, TransportManagerDialProgressEvents } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'

/**
 * Options for dialing a connection using the `TransportManager`.
 */
export interface TransportManagerDialOptions extends AbortOptions, ProgressOptions<TransportManagerDialProgressEvents> {

}

/**
 * The `TransportManager` handles the management of network transports, allowing
 * opening connections or listening using specific transports, etc.
 *
 * This is a low-level component - any connections opened will not be managed by
 * the `ConnectionManager` or included in any configured connection limits, etc.
 *
 * Most consumers will call `openConnection` on the `ConnectionManager` instead.
 */
export interface TransportManager {
  /**
   * Add a transport to the transport manager.
   *
   * @param transport - The transport instance to be added.
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
   */
  dial(ma: Multiaddr, options?: TransportManagerDialOptions): Promise<Connection>

  /**
   * Return all addresses currently being listened on
   *
   * @returns An array of `Multiaddr` objects.
   */
  getAddrs(): Multiaddr[]

  /**
   * Return all registered transports
   *
   * @returns An array of `Transport` instances.
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
   *
   * @param addrs - An array of multiaddrs to listen on.
   * @returns A promise that resolves once the transport is actively listening.
   */
  listen(addrs: Multiaddr[]): Promise<void>

  /**
   * Remove a previously configured transport
   *
   * @param key - The transport key or identifier.
   * @returns A promise that resolves once the transport is removed.
   */
  remove(key: string): Promise<void>

  /**
   * Remove all transports
   *
   * @returns A promise that resolves once all transports are removed.
   */
  removeAll(): Promise<void>
}
