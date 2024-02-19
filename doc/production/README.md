# Production

Nowadays, you can run JavaScript code in several different environments, some of them with their own particularities. Moreover, you can use `js-libp2p` for a wide range of use cases. Different environments and different use cases mean different configurations and challenges in the network.

Libp2p nodes can vary from nodes behind an application, to infrastructure nodes that enable the network to operate and to be efficient. In this context, the Libp2p project provides public infrastructure to boost the network, enable nodes connectivity and improve constrained nodes performance. This public infrastructure should be leveraged for learning the concepts and experimenting. When an application on top of libp2p aims to move into production, its own infrastructure should be setup as the public nodes will be intensively used by others and its availability is not guaranteed.

This guide aims to guide you from using the public infrastructure into setting up your own.

## Table of Contents

- [Production](#production)
  - [Table of Contents](#table-of-contents)
  - [Joining the Network](#joining-the-network)
  - [Connecting to Nodes with connectivity limitations](#connecting-to-nodes-with-connectivity-limitations)
  - [Querying the network from the browser](#querying-the-network-from-the-browser)
  - [Others](#others)
    - [SSL](#ssl)

## Joining the Network

Once a libp2p node stars, it will need to connect to a set of peers in order to establish its overlay network.

Currently `js-libp2p` is not the best choice for being a bootstrap node. Its DHT needs to be improved, in order to become an effective server to enable other nodes to properly bootstrap their network.

Setting up a fleet of [`go-libp2p`](https://github.com/libp2p/go-libp2p) nodes is the recommended way to proceed here.

## Connecting to Nodes with connectivity limitations

While the libp2p core codebase aims to work in multiple environments, there are some limitations that are not possible to overcome at the time of writing. These limitations include browser nodes, nodes behind NAT, reverse proxies, firewalls, or lack of compatible transports.

In the browser, libp2p supports three transports: `WebSockets`, `WebRTC`, and `WebTransport`.

- [WebSockets](https://github.com/libp2p/js-libp2p/tree/main/packages/transport-websockets) is generally used as a full-duplex communication protocol over a single TCP connection, allowing for real-time data transfer between the client and the server.
- [WebRTC](https://github.com/libp2p/js-libp2p/tree/main/packages/transport-webrtc) is primarly geared towards facilitating browser-to-browser connections. It also enables browsers to connect to public server nodes without those server nodes providing a TLS certificate within the browser's trustchain. This differs from the `WebSockets` transport as the browser requires the remote to have a trusted TLS certificate. Please note that webRTC iss currently not supported by [go-libp2p](https://github.com/libp2p/go-libp2p/issues/2009) but this is in development.
- [WebTransport](https://github.com/libp2p/js-libp2p/tree/main/packages/transport-webtransport) is a way for browsers to establish a stream-multiplexed and bidirectional connection to servers, that uses QUIC to offer an alternative to WebSocket. It exhibits all the advantages of QUIC over TCP, including faster handshakes, no head-of-line blocking, and being future-proof. Browsers cannot listen for WebTransport connections since it is similar to TCP in that it requires opening sockets on the host machine which is forbidden by the browser security model.

Libp2p nodes acting as circuit relay aim to establish connectivity between libp2p nodes (e.g. IPFS nodes) that wouldn't otherwise be able to establish a direct connection to each other.

A relay is needed in situations where nodes are behind NAT, reverse proxies, firewalls and/or simply don't support the same transports (e.g. go-libp2p vs. browser-libp2p). The circuit relay protocol exists to overcome those scenarios. Nodes with the `auto-relay` feature enabled can automatically bind themselves on a relay to listen for connections on their behalf.

## Querying the network from the browser

Libp2p nodes in scenarios such as browser environment and constrained devices will not be an efficient node in the libp2p DHT overlay, as a consequence of their known limitations regarding connectivity and performance.

Aiming to support these type of nodes to find other peers and content in the network, delegate nodes can be setup. With a set of well known IPFS delegate nodes, nodes with limitations in the network can leverage them to perform peer and content routing queries.

Currently, delegate nodes must be IPFS nodes as the IPFS HTTP API is leveraged by them to make routing queries.

You can read on how to setup your own set of delegated nodes in [DELEGATE_NODES.md](./DELEGATE_NODES.md).

## Others

### SSL

TODO
