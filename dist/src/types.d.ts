import type PeerId from 'peer-id';
import type { Multiaddr } from 'multiaddr';
import type { MultiaddrConnection } from 'libp2p-interfaces/src/transport/types';
export interface ConnectionGater {
    /**
     * denyDialMultiaddr tests whether we're permitted to Dial the
     * specified peer.
     *
     * This is called by the dialer.connectToPeer implementation before
     * dialling a peer.
     *
     * Return true to prevent dialing the passed peer.
     */
    denyDialPeer: (peerId: PeerId) => Promise<boolean>;
    /**
     * denyDialMultiaddr tests whether we're permitted to dial the specified
     * multiaddr for the given peer.
     *
     * This is called by the dialer.connectToPeer implementation after it has
     * resolved the peer's addrs, and prior to dialling each.
     *
     * Return true to prevent dialing the passed peer on the passed multiaddr.
     */
    denyDialMultiaddr: (peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>;
    /**
     * denyInboundConnection tests whether an incipient inbound connection is allowed.
     *
     * This is called by the upgrader, or by the transport directly (e.g. QUIC,
     * Bluetooth), straight after it has accepted a connection from its socket.
     *
     * Return true to deny the incoming passed connection.
     */
    denyInboundConnection: (maConn: MultiaddrConnection) => Promise<boolean>;
    /**
     * denyOutboundConnection tests whether an incipient outbound connection is allowed.
     *
     * This is called by the upgrader, or by the transport directly (e.g. QUIC,
     * Bluetooth), straight after it has created a connection with its socket.
     *
     * Return true to deny the incoming passed connection.
     */
    denyOutboundConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>;
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
    denyInboundEncryptedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>;
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
    denyOutboundEncryptedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>;
    /**
     * denyInboundUpgradedConnection tests whether a fully capable connection is allowed.
     *
     * This is called after encryption has been negotiated and the connection has been
     * multiplexed, if a multiplexer is configured.
     *
     * Return true to deny the passed upgraded connection.
     */
    denyInboundUpgradedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>;
    /**
     * denyOutboundUpgradedConnection tests whether a fully capable connection is allowed.
     *
     * This is called after encryption has been negotiated and the connection has been
     * multiplexed, if a multiplexer is configured.
     *
     * Return true to deny the passed upgraded connection.
     */
    denyOutboundUpgradedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>;
    /**
     * Used by the address book to filter passed addresses.
     *
     * Return true to allow storing the passed multiaddr for the passed peer.
     */
    filterMultiaddrForPeer: (peer: PeerId, multiaddr: Multiaddr) => Promise<boolean>;
}
//# sourceMappingURL=types.d.ts.map