import type PeerId from 'peer-id'
import type { Multiaddr } from 'multiaddr'
import type { MultiaddrConnection } from 'libp2p-interfaces/src/transport/types'
import type { MuxedStream } from 'libp2p-interfaces/src/stream-muxer/types'

export interface ConnectionGater {
  /**
   * InterceptPeerDial tests whether we're permitted to Dial the
   * specified peer.
   *
   * This is called by the dialer.connectToPeer implementation when
   * dialling a peer.
   *
   * Return true to deny dialing the passed peer.
   */
  interceptPeerDial: (peerId: PeerId) => Promise<boolean>

  /**
   * InterceptAddrDial tests whether we're permitted to dial the specified
   * multiaddr for the given peer.
   *
   * This is called by the dialer.connectToPeer implementation after it has
   * resolved the peer's addrs, and prior to dialling each.
   *
   * Return true to deny dialing the passed peer on the passed multiaddr.
   */
  interceptAddrDial: (peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>

  /**
   * InterceptAccept tests whether an incipient inbound connection is allowed.
   *
   * This is called by the upgrader, or by the transport directly (e.g. QUIC,
   * Bluetooth), straight after it has accepted a connection from its socket.
   *
   * Return true to deny accepting the passed connection.
   */
  interceptAccept: (maConn: MultiaddrConnection) => Promise<boolean>

  /**
   * InterceptSecured tests whether a given connection, now authenticated,
   * is allowed.
   *
   * This is called by the upgrader, after it has performed the security
   * handshake, and before it negotiates the muxer, or by the directly by the
   * transport, at the exact same checkpoint.
   *
   * Return true to deny accepting the passed connection.
   */
  interceptSecured: (direction: 'inbound' | 'outbound', peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

  /**
   * InterceptUpgraded tests whether a fully capable connection is allowed.
   *
   * Return true to deny accepting the passed connection.
   */
  interceptUpgraded: (maConn: MultiaddrConnection | MuxedStream) => Promise<boolean>
}
