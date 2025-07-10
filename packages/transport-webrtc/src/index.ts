/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebRTC data channels](https://webrtc.org/).
 *
 * [WebRTC](https://www.w3.org/TR/webrtc/) is a specification that allows real-time communication between nodes - it's commonly used in browser video conferencing applications but it also provides a reliable data transport mechanism called [data channels](https://www.w3.org/TR/webrtc/#peer-to-peer-data-api) which libp2p uses to facilitate [protocol streams](https://docs.libp2p.io/concepts/multiplex/overview/) between peers.
 *
 * There are two transports exposed by this module, [webRTC](https://github.com/libp2p/specs/blob/master/webrtc/webrtc.md) and [webRTCDirect](https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md).
 *
 * ## WebRTC vs WebRTC Direct
 *
 * The connection establishment phase of WebRTC involves a handshake using [SDP](https://en.wikipedia.org/wiki/Session_Description_Protocol) during which two peers will exchange information such as open ports, network addresses and required capabilities.
 *
 * A third party is usually necessary to carry out this handshake, forwarding messages between the two peers until they can make a direct connection between themselves.
 *
 * The WebRTC transport uses libp2p [Circuit Relay](https://docs.libp2p.io/concepts/nat/circuit-relay/)s to forward SDP messages. Once a direct connection is formed the relay plays no further part in the exchange.
 *
 * WebRTC Direct uses a technique known as [SDP munging](https://webrtchacks.com/not-a-guide-to-sdp-munging/) to skip the handshake step, instead encoding enough information in the connection request that the responder can derive what would have been in the handshake messages and so requires no third parties to establish a connection.
 *
 * A WebRTC Direct multiaddr also includes a certhash of the target peer - this is used to allow opening a connection to the remote, which would otherwise be denied due to use of a self-signed certificate.
 *
 * In both cases, once the connection is established a [Noise handshake](https://noiseprotocol.org/noise.html) is carried out to ensure that the remote peer has the private key that corresponds to the public key that makes up their PeerId, giving you both encryption and authentication.
 *
 * @example WebRTC
 *
 * WebRTC requires use of a relay to connect two nodes. The listener first discovers a relay server and makes a reservation, then the dialer can connect via the relayed address.
 *
 * ```TypeScript
 * import { noise } from '@chainsafe/libp2p-noise'
 * import { yamux } from '@chainsafe/libp2p-yamux'
 * import { echo } from '@libp2p/echo'
 * import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2'
 * import { identify } from '@libp2p/identify'
 * import { webRTC } from '@libp2p/webrtc'
 * import { webSockets } from '@libp2p/websockets'
 * import { WebRTC } from '@multiformats/multiaddr-matcher'
 * import delay from 'delay'
 * import { pipe } from 'it-pipe'
 * import { createLibp2p } from 'libp2p'
 * import type { Multiaddr } from '@multiformats/multiaddr'
 *
 * // the relay server listens on a transport dialable by the listener and the
 * // dialer, and has a relay service configured
 * const relay = await createLibp2p({
 *   addresses: {
 *   listen: ['/ip4/127.0.0.1/tcp/0/ws']
 *   },
 *   transports: [
 *     webSockets()
 *   ],
 *   connectionEncrypters: [noise()],
 *   streamMuxers: [yamux()],
 *   connectionGater: {
 *     denyDialMultiaddr: () => false
 *   },
 *   services: {
 *     identify: identify(),
 *     relay: circuitRelayServer()
 *   }
 * })
 *
 * // the listener has a WebSocket transport to dial the relay, a Circuit Relay
 * // transport to make a reservation, and a WebRTC transport to accept incoming
 * // WebRTC connections
 * const listener = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/p2p-circuit',
 *       '/webrtc'
 *     ]
 *   },
 *   transports: [
 *     webSockets(),
 *     webRTC(),
 *     circuitRelayTransport()
 *   ],
 *   connectionEncrypters: [noise()],
 *   streamMuxers: [yamux()],
 *   connectionGater: {
 *     denyDialMultiaddr: () => false
 *   },
 *   services: {
 *     identify: identify(),
 *     echo: echo()
 *   }
 * })
 *
 * // the listener dials the relay (or discovers a public relay via some other
 * // method)
 * await listener.dial(relay.getMultiaddrs(), {
 *   signal: AbortSignal.timeout(5000)
 * })
 *
 * let webRTCMultiaddr: Multiaddr | undefined
 *
 * // wait for the listener to make a reservation on the relay
 * while (true) {
 *   webRTCMultiaddr = listener.getMultiaddrs().find(ma => WebRTC.matches(ma))
 *
 *   if (webRTCMultiaddr != null) {
 *     break
 *   }
 *
 *   // try again later
 *   await delay(1000)
 * }
 *
 * // the dialer has Circuit Relay, WebSocket and WebRTC transports to dial
 * // the listener via the relay, complete the SDP handshake and establish a
 * // direct WebRTC connection
 * const dialer = await createLibp2p({
 *   transports: [
 *     webSockets(),
 *     webRTC(),
 *     circuitRelayTransport()
 *   ],
 *   connectionEncrypters: [noise()],
 *   streamMuxers: [yamux()],
 *   connectionGater: {
 *     denyDialMultiaddr: () => false
 *   },
 *   services: {
 *     identify: identify(),
 *     echo: echo()
 *   }
 * })
 *
 * // dial the listener and open an echo protocol stream
 * const stream = await dialer.dialProtocol(webRTCMultiaddr, dialer.services.echo.protocol, {
 *   signal: AbortSignal.timeout(5000)
 * })
 *
 * // we can now stop the relay
 * await relay.stop()
 *
 * // send/receive some data from the remote peer via a direct connection
 * await pipe(
 *   [new TextEncoder().encode('hello world')],
 *   stream,
 *   async source => {
 *     for await (const buf of source) {
 *       console.info(new TextDecoder().decode(buf.subarray()))
 *     }
 *   }
 * )
 * ```
 *
 * @example WebRTC Direct
 *
 * WebRTC Direct allows a client to establish a WebRTC connection to a server
 * without using a relay to first exchange SDP messages.
 *
 * Instead the server listens on a public UDP port and embeds its certificate
 * hash in the published multiaddr. It derives the client's SDP offer based on
 * the incoming IP/port of STUN messages sent to this public port.
 *
 * The client derives the server's SDP answer based on the information in the
 * multiaddr so no SDP handshake via a third party is required.
 *
 * Full details of the connection protocol can be found in the [WebRTC Direct spec](https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md).
 *
 * Browsers cannot listen on WebRTC Direct addresses since they cannot open
 * ports, but they can dial all spec-compliant servers.
 *
 * Node.js/go and rust-libp2p can listen on and dial WebRTC Direct addresses.
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { multiaddr } from '@multiformats/multiaddr'
 * import { pipe } from 'it-pipe'
 * import { fromString, toString } from 'uint8arrays'
 * import { webRTCDirect } from '@libp2p/webrtc'
 *
 * const listener = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip4/0.0.0.0/udp/0/webrtc-direct'
 *     ]
 *   },
 *   transports: [
 *     webRTCDirect()
 *   ]
 * })
 *
 * await listener.start()
 *
 * const dialer = await createLibp2p({
 *   transports: [
 *     webRTCDirect()
 *   ]
 * })
 *
 * await dialer.start()
 *
 * const stream = await dialer.dialProtocol(listener.getMultiaddrs(), '/my-protocol/1.0.0', {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * await pipe(
 *   [fromString(`Hello js-libp2p-webrtc\n`)],
 *   stream,
 *   async function (source) {
 *     for await (const buf of source) {
 *       console.info(toString(buf.subarray()))
 *     }
 *   }
 * )
 * ```
 *
 * ## WebRTC Direct certificate hashes
 *
 * WebRTC Direct listeners publish the hash of their TLS certificate as part of
 * the listening multiaddr.
 *
 * By default these certificates are generated at start up using an ephemeral
 * keypair that only exists while the node is running.
 *
 * This means that the certificate hashes change when the node is restarted,
 * which can be undesirable if multiaddrs are intended to be long lived (e.g.
 * if the node is used as a network bootstrapper).
 *
 * To reuse the same certificate and keypair, configure a persistent datastore
 * and the [@libp2p/keychain](https://www.npmjs.com/package/@libp2p/keychain)
 * service as part of your service map:
 *
 * @example Reuse TLS certificates after restart
 *
 * ```ts
 * import { LevelDatastore } from 'datastore-level'
 * import { webRTCDirect } from '@libp2p/webrtc'
 * import { keychain } from '@libp2p/keychain'
 * import { createLibp2p } from 'libp2p'
 *
 * // store data on disk between restarts
 * const datastore = new LevelDatastore('/path/to/store')
 *
 * const listener = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip4/0.0.0.0/udp/0/webrtc-direct'
 *     ]
 *   },
 *   datastore,
 *   transports: [
 *     webRTCDirect()
 *   ],
 *   services: {
 *     keychain: keychain()
 *   }
 * })
 *
 * await listener.start()
 *
 * console.info(listener.getMultiaddrs())
 * // /ip4/...../udp/../webrtc-direct/certhash/foo
 *
 * await listener.stop()
 * await listener.start()
 *
 * console.info(listener.getMultiaddrs())
 * // /ip4/...../udp/../webrtc-direct/certhash/foo
 * ```
 */

import { WebRTCTransport } from './private-to-private/transport.js'
import { WebRTCDirectTransport } from './private-to-public/transport.js'
import type { WebRTCTransportComponents, WebRTCTransportInit } from './private-to-private/transport.js'
import type { WebRTCTransportDirectInit, WebRTCDirectTransportComponents } from './private-to-public/transport.js'
import type { Transport } from '@libp2p/interface'

export interface DataChannelOptions {
  /**
   * The maximum message size to be sent over the channel in bytes
   *
   * @default 16_384
   */
  maxMessageSize?: number

  /**
   * If the channel's `bufferedAmount` grows over this amount in bytes, wait
   * for it to drain before sending more data
   *
   * @default 16_777_216
   */
  maxBufferedAmount?: number

  /**
   * When `bufferedAmount` is above `maxBufferedAmount`, we pause sending until
   * the `bufferedAmountLow` event fires - this controls how long we wait for
   * that event in ms
   *
   * @default 30_000
   */
  bufferedAmountLowEventTimeout?: number

  /**
   * When closing a stream, we wait for `bufferedAmount` to become 0 before
   * closing the underlying RTCDataChannel - this controls how long we wait
   * in ms
   *
   * @default 30_000
   */
  drainTimeout?: number

  /**
   * When closing a stream we first send a FIN flag to the remote and wait
   * for a FIN_ACK reply before closing the underlying RTCDataChannel - this
   * controls how long we wait for the acknowledgement in ms
   *
   * @default 5_000
   */
  closeTimeout?: number

  /**
   * When sending the first data message, if the channel is not in the "open"
   * state, wait this long for the "open" event to fire.
   *
   * @default 5_000
   */
  openTimeout?: number
}

/**
 * PEM format server certificate and private key
 */
export interface TransportCertificate {
  /**
   * The private key for the certificate in PEM format
   */
  privateKey: string

  /**
   * PEM format certificate
   */
  pem: string

  /**
   * The hash of the certificate
   */
  certhash: string
}

export type { WebRTCTransportDirectInit, WebRTCDirectTransportComponents }

function webRTCDirect (init?: WebRTCTransportDirectInit): (components: WebRTCDirectTransportComponents) => Transport {
  return (components: WebRTCDirectTransportComponents) => new WebRTCDirectTransport(components, init)
}

export type { WebRTCTransportInit, WebRTCTransportComponents }

function webRTC (init?: WebRTCTransportInit): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components, init)
}

export { webRTC, webRTCDirect }
