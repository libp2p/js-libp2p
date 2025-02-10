import type { AbortOptions, Connection, Listener, Transport, TransportManagerDialProgressEvents } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'

export interface TransportManagerDialOptions extends AbortOptions, ProgressOptions<TransportManagerDialProgressEvents> {

}

export interface TransportManager {
  /**
   * Add a transport to the transport manager
   */
  add(transport: Transport): void

  /**
   * Dial a multiaddr. Connections returned by this method will not be tracked
   * by the connection manager so can cause memory leaks. If you need to dial
   * a multiaddr, you may want to call openConnection on the connection manager
   * instead.
   */
  dial(ma: Multiaddr, options?: TransportManagerDialOptions): Promise<Connection>

  /**
   * Return all addresses currently being listened on
   */
  getAddrs(): Multiaddr[]

  /**
   * Return all registered transports
   */
  getTransports(): Transport[]

  /**
   * Return all listeners
   */
  getListeners(): Listener[]

  /**
   * Get the transport to dial a given multiaddr, if one has been configured
   */
  dialTransportForMultiaddr(ma: Multiaddr): Transport | undefined

  /**
   * Get the transport to listen on a given multiaddr, if one has been
   * configured
   */
  listenTransportForMultiaddr(ma: Multiaddr): Transport | undefined

  /**
   * Listen on the passed multiaddrs
   */
  listen(addrs: Multiaddr[]): Promise<void>

  /**
   * Remove a previously configured transport
   */
  remove(key: string): Promise<void>

  /**
   * Remove all transports
   */
  removeAll(): Promise<void>
}
