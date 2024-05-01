import type { AbortOptions, PendingDial, Connection, MultiaddrConnection, PeerId, IsDialableOptions } from '@libp2p/interface'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface OpenConnectionOptions extends AbortOptions {
  /**
   * Connection requests with a higher priority will be executed before those
   * with a lower priority. (default: 50)
   */
  priority?: number

  /**
   * When opening a connection to a remote peer, if a connection already exists
   * it will be returned instead of creating a new connection. Pass true here
   * to override that and dial a new connection anyway. (default: false)
   */
  force?: boolean
}

export interface ConnectionManager {
  /**
   * Return connections, optionally filtering by a PeerId
   *
   * @example
   *
   * ```TypeScript
   * const connections = libp2p.connectionManager.get(peerId)
   * // []
   * ```
   */
  getConnections(peerId?: PeerId): Connection[]

  /**
   * Return a map of all connections with their associated PeerIds
   *
   * @example
   *
   * ```TypeScript
   * const connectionsMap = libp2p.connectionManager.getConnectionsMap()
   * ```
   */
  getConnectionsMap(): PeerMap<Connection[]>

  /**
   * Open a connection to a remote peer
   *
   * @example
   *
   * ```TypeScript
   * const connection = await libp2p.connectionManager.openConnection(peerId)
   * ```
   */
  openConnection(peer: PeerId | Multiaddr | Multiaddr[], options?: OpenConnectionOptions): Promise<Connection>

  /**
   * Close our connections to a peer
   */
  closeConnections(peer: PeerId, options?: AbortOptions): Promise<void>

  /**
   * Invoked after an incoming connection is opened but before PeerIds are
   * exchanged, this lets the ConnectionManager check we have sufficient
   * resources to accept the connection in which case it will return true,
   * otherwise it will return false.
   */
  acceptIncomingConnection(maConn: MultiaddrConnection): Promise<boolean>

  /**
   * Invoked after upgrading a multiaddr connection has finished
   */
  afterUpgradeInbound(): void

  /**
   * Return the list of in-progress or queued dials
   *
   * @example
   *
   * ```TypeScript
   * const dials = libp2p.connectionManager.getDialQueue()
   * ```
   */
  getDialQueue(): PendingDial[]

  /**
   * Given the current node configuration, returns a promise of `true` or
   * `false` if the node would attempt to dial the passed multiaddr.
   *
   * This means a relevant transport is configured, and the connection gater
   * would not block the dial attempt.
   *
   * This may involve resolving DNS addresses so you should pass an AbortSignal.
   */
  isDialable(multiaddr: Multiaddr | Multiaddr[], options?: IsDialableOptions): Promise<boolean>
}
