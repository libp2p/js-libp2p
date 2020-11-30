# Production

Nowadays, you can run JavaScript code in several different environments, some of them with their own particularities. Moreover, you can use `js-libp2p` for a wide range of use cases. Different environments and different use cases mean different configurations and challenges in the network.

Libp2p nodes can vary from nodes behind an application, to infrastructure nodes that enable the network to operate and to be efficient. In this context, the Libp2p project provides public infrastructure to boost the network, enable nodes connectivity and improve constrained nodes performance. This public infrastructure should be leveraged for learning the concepts and experimenting. When an application on top of libp2p aims to move into production, its own infrastructure should be setup as the public nodes will be intensively used by others and its availability is not guaranteed.

This guide aims to guide you from using the public infrastructure into setting up your own.

## Table of Contents

* [Production](#production)
  * [Star servers](#star-servers)
  * [Delegate nodes](#delegate-nodes)
  * [Circuit Relay](#circuit-relay)

## `webrtc-star` servers

While the libp2p core codebase aims to work in multiple environments, there are some limitations that are not possible to overcome at the time of writing. Regarding `webRTC`, at the time of writing a set of star servers are needed to act as a rendezvous point, where peers can learn about other peers (`peer-discovery`), as well as exchange their SDP offers (signaling data).

You can read on how to setup your own set of delegated nodes in [libp2p/js-libp2p-webrtc-star/DEPLOYMENT.md](https://github.com/libp2p/js-libp2p-webrtc-star/blob/master/DEPLOYMENT.md).

It is worth pointing out that with new discovery protocols on the way, as well as support for distributed signaling, the star servers should be deprecated on the long run.

## Delegate nodes

Libp2p nodes in scenarios such as browser environment and constrained devices will not be an efficient node in the libp2p DHT overlay, as a consequence of their known limitations regarding connectivity and performance.

Aiming to support these type of nodes to find other peers and content in the network, delegate nodes can be setup. With a set of well known libp2p delegate nodes, nodes with limitations in the network can leverage them to perform peer and content routing calls.

You can read on how to setup your own set of delegated nodes in [DELEGATE_NODES.md](./DELEGATE_NODES.md).

## Circuit Relay

Libp2p nodes acting as circuit relay aim to establish connectivity between libp2p nodes (e.g. IPFS nodes) that wouldn't otherwise be able to establish a direct connection to each other.

A relay is needed in situations where nodes are behind NAT, reverse proxies, firewalls and/or simply don't support the same transports (e.g. go-libp2p vs. browser-libp2p). The circuit relay protocol exists to overcome those scenarios. Nodes with the `auto-relay` feature enabled can automatically bind themselves on a relay to listen for connections on their behalf.

You can use [libp2p/js-libp2p-hop-relay-server](https://github.com/libp2p/js-libp2p-hop-relay-server) to setup your own relay server. This also includes an easy to customize Docker setup for a HOP Relay.
