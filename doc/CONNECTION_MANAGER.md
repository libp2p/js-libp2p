# Connection Manager

The Connection Manager works with the Registrar to keep connections across libp2p within acceptable ranges, which can be configured. By default Connection Manager will monitor:
- The total number of open connections
- The latency/delay of the event loop

If Metrics are enabled for libp2p, see [./CONFIGURATION.md#configuring-metrics](./CONFIGURATION.md#configuring-metrics) on how to configure metrics, the Connection Manager can be used to prune connections when certain limits are exceeded.

The following is a list of available options for setting limits for the Connection Manager to enforce.

## Options
- `maxConnections`: the maximum number of connections libp2p is willing to have before it starts disconnecting. Defaults to `Infinity`
- `minConnections`: the minimum number of connections below which libp2p not activate preemptive disconnections. Defaults to `0`.
- `maxData`: sets the maximum data — in bytes per second -  (sent and received) this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
- `maxSentData`: sets the maximum sent data — in bytes per second -  this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
- `maxReceivedData`: sets the maximum received data — in bytes per second -  this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
- `maxEventLoopDelay`: sets the maximum event loop delay (measured in milliseconds) this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
- `pollInterval`: sets the poll interval (in milliseconds) for assessing the current state and determining if this peer needs to force a disconnect. Defaults to `2000` (2 seconds).
- `movingAverageInterval`: the interval used to calculate moving averages (in milliseconds). Defaults to `60000` (1 minute). This must be an available interval configured in `Metrics`
- `defaultPeerValue`: number between 0 and 1. Defaults to 1.
- `gater`: gater options.

### Gater Options
```
gater = {
  // InterceptPeerDial tests whether we're permitted to Dial the specified peer.
  //
  // This is called by the dialer.connectToPeer implementation when dialling a peer.
  interceptPeerDial: async (/** @type {PeerId} */ peerId) => false,

  // InterceptAddrDial tests whether we're permitted to dial the specified
  // multiaddr for the given peer.
  //
  // This is called by the dialer.connectToPeer implementation after it has
  // resolved the peer's addrs, and prior to dialling each.
  interceptAddrDial: async (/** @type {PeerId} */ peerId, /** @type {Multiaddr} */ multiaddr) => false,

  // InterceptAccept tests whether an incipient inbound connection is allowed.
  //
  // This is called by the upgrader, or by the transport directly (e.g. QUIC,
  // Bluetooth), straight after it has accepted a connection from its socket.
  interceptAccept: async (/** @type {MultiaddrConnection} */ maConn) => false,

  // InterceptSecured tests whether a given connection, now authenticated,
  // is allowed.
  //
  // This is called by the upgrader, after it has performed the security
  // handshake, and before it negotiates the muxer, or by the directly by the
  // transport, at the exact same checkpoint.
  interceptSecured: async (/** @type {'inbound' | 'outbound'}*/ direction, /** @type {PeerId} */ peerId, /** @type {MultiaddrConnection} */ maConn) => false,

  // InterceptUpgraded tests whether a fully capable connection is allowed.
  interceptUpgraded: async (/** @type {MultiaddrConnection | MuxedStream} */ maConn) => false,

}
```