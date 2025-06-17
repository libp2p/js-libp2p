import type { AbortOptions, PendingDial, Connection, MultiaddrConnection, PeerId, IsDialableOptions, OpenConnectionProgressEvents } from '@libp2p/interface'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions } from 'progress-events'

/**
 * Options for opening a connection to a remote peer.
 */
export interface OpenConnectionOptions extends AbortOptions, ProgressOptions<OpenConnectionProgressEvents> {
  /**
   * Connection requests with a higher priority will be executed before those
   * with a lower priority.
   *
   * @default 50
   */
  priority?: number

  /**
   * When opening a connection to a remote peer, if a connection already exists
   * it will be returned instead of creating a new connection. Pass true here
   * to override that and dial a new connection anyway.
   *
   * @default false
   */
  force?: boolean

  /**
   * By default a newly opened outgoing connection operates in initiator mode
   * during negotiation of encryption/muxing protocols using multistream-select.
   *
   * In some cases such as when the dialer is trying to achieve TCP Simultaneous
   * Connect using the DCUtR protocol, it may wish to act in responder mode, if
   * so pass `false` here.
   *
   * @default true
   */
  initiator?: boolean
}

/**
 * The `ConnectionManager` handles managing connections between peers in a libp2p network.
 * It provides methods for opening, closing, and querying connections.This also provides methods
 * for accessing the dial queue.
 */
export interface ConnectionManager {
  /**
   * Return connections, optionally filtering by a PeerId
   *
   * @param peerId - The PeerId to filter connections (optional).
   * @returns An array of active `Connection` objects.
   */
  getConnections(peerId?: PeerId): Connection[]

  /**
   * Return a map of all connections with their associated PeerIds
   *
   * @returns A `PeerMap` containing `Connection[]` objects.
   */
  getConnectionsMap(): PeerMap<Connection[]>

  /**
   * Returns the configured maximum number of connections this connection
   * manager will accept
   *
   * @returns The maximum connection limit.
   */
  getMaxConnections(): number

  /**
   * Update the maximum number of connections that are accepted - setting this
   * to a smaller value than the current setting will cause connections to be
   * pruned.
   */
  setMaxConnections(maxConnections: number): void

  /**
   * Open a connection to a remote peer
   *
   * @param peer - The target `PeerId`, `Multiaddr`, or an array of `Multiaddr`s.
   * @param options - Optional parameters for connection handling.
   * @returns A promise that resolves to a `Connection` object.
   */
  openConnection(peer: PeerId | Multiaddr | Multiaddr[], options?: OpenConnectionOptions): Promise<Connection>

  /**
   * Close our connections to a peer
   *
   * @param peer - The `PeerId` whose connections should be closed.
   * @param options - Optional abort options.
   * @returns A promise that resolves once the connections are closed.
   */
  closeConnections(peer: PeerId, options?: AbortOptions): Promise<void>

  /**
   * Invoked after an incoming connection is opened but before PeerIds are
   * exchanged, this lets the ConnectionManager check we have sufficient
   * resources to accept the connection in which case it will return true,
   * otherwise it will return false.
   *
   * @param maConn - The multiaddr connection to evaluate.
   * @returns A promise that resolves to `true` if the connection can be accepted, `false` otherwise.
   */
  acceptIncomingConnection(maConn: MultiaddrConnection): Promise<boolean>

  /**
   * Invoked after upgrading an inbound multiaddr connection has finished
   */
  afterUpgradeInbound(): void

  /**
   * Return the list of in-progress or queued dials
   *
   * @returns An array of `PendingDial` objects.
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
   *
   * @param multiaddr - The target multiaddr or an array of multiaddrs.
   * @param options - Optional parameters for dialability check.
   * @returns A promise that resolves to `true` if the multiaddr is dialable, `false` otherwise.
   */
  isDialable(multiaddr: Multiaddr | Multiaddr[], options?: IsDialableOptions): Promise<boolean>
}
