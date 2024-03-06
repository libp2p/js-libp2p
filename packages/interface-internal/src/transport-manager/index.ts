import type { Connection, Listener, Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

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
  dial(ma: Multiaddr, options?: any): Promise<Connection>

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
   * Get the transport for a given multiaddr, if one has been configured
   */
  transportForMultiaddr(ma: Multiaddr): Transport | undefined

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
