import type { MultiaddrConnection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface ConnectionGater {
  /**
   * denyDialPeer tests whether we're permitted to Dial the
   * specified peer.
   *
   * This is called by the dialer.connectToPeer implementation before
   * dialling a peer.
   *
   * Return true to prevent dialing the passed peer.
   */
  denyDialPeer?(peerId: PeerId): Promise<boolean> | boolean

  /**
   * denyDialMultiaddr tests whether we're permitted to dial the specified
   * multiaddr.
   *
   * This is called by the connection manager - if the peer id of the remote
   * node is known it will be present in the multiaddr.
   *
   * Return true to prevent dialing the passed peer on the passed multiaddr.
   */
  denyDialMultiaddr?(multiaddr: Multiaddr): Promise<boolean> | boolean

  /**
   * denyInboundConnection tests whether an incipient inbound connection is allowed.
   *
   * This is called by the upgrader, or by the transport directly (e.g. QUIC,
   * Bluetooth), straight after it has accepted a connection from its socket.
   *
   * Return true to deny the incoming passed connection.
   */
  denyInboundConnection?(maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyOutboundConnection tests whether an incipient outbound connection is allowed.
   *
   * This is called by the upgrader, or by the transport directly (e.g. QUIC,
   * Bluetooth), straight after it has created a connection with its socket.
   *
   * Return true to deny the incoming passed connection.
   */
  denyOutboundConnection?(peerId: PeerId, maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyInboundEncryptedConnection tests whether a given connection, now encrypted,
   * is allowed.
   *
   * This is called by the upgrader, after it has performed the security
   * handshake, and before it negotiates the muxer, or by the directly by the
   * transport, at the exact same checkpoint.
   *
   * Return true to deny the passed secured connection.
   */
  denyInboundEncryptedConnection?(peerId: PeerId, maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyOutboundEncryptedConnection tests whether a given connection, now encrypted,
   * is allowed.
   *
   * This is called by the upgrader, after it has performed the security
   * handshake, and before it negotiates the muxer, or by the directly by the
   * transport, at the exact same checkpoint.
   *
   * Return true to deny the passed secured connection.
   */
  denyOutboundEncryptedConnection?(peerId: PeerId, maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyInboundUpgradedConnection tests whether a fully capable connection is allowed.
   *
   * This is called after encryption has been negotiated and the connection has been
   * multiplexed, if a multiplexer is configured.
   *
   * Return true to deny the passed upgraded connection.
   */
  denyInboundUpgradedConnection?(peerId: PeerId, maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyOutboundUpgradedConnection tests whether a fully capable connection is allowed.
   *
   * This is called after encryption has been negotiated and the connection has been
   * multiplexed, if a multiplexer is configured.
   *
   * Return true to deny the passed upgraded connection.
   */
  denyOutboundUpgradedConnection?(peerId: PeerId, maConn: MultiaddrConnection): Promise<boolean> | boolean

  /**
   * denyInboundRelayReservation tests whether a remote peer is allowed make a
   * relay reservation on this node.
   *
   * Return true to deny the relay reservation.
   */
  denyInboundRelayReservation?(source: PeerId): Promise<boolean> | boolean

  /**
   * denyOutboundRelayedConnection tests whether a remote peer is allowed to open a relayed
   * connection to the destination node.
   *
   * This is invoked on the relay server when a source client with a reservation instructs
   * the server to relay a connection to a destination peer.
   *
   * Return true to deny the relayed connection.
   */
  denyOutboundRelayedConnection?(source: PeerId, destination: PeerId): Promise<boolean> | boolean

  /**
   * denyInboundRelayedConnection tests whether a remote peer is allowed to open a relayed
   * connection to this node.
   *
   * This is invoked on the relay client when a remote relay has received an instruction to
   * relay a connection to the client.
   *
   * Return true to deny the relayed connection.
   */
  denyInboundRelayedConnection?(relay: PeerId, remotePeer: PeerId): Promise<boolean> | boolean

  /**
   * Used by the address book to filter passed addresses.
   *
   * Return true to allow storing the passed multiaddr for the passed peer.
   */
  filterMultiaddrForPeer?(peer: PeerId, multiaddr: Multiaddr): Promise<boolean> | boolean
}
