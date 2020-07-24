# Production

`js-libp2p` can be used in multiple environments, as well as for a wide range of use cases. Different environments and different use cases mean different configurations and challenges in the network.

Libp2p nodes in the network can vary from nodes behind an application, to infrastructure nodes that enable the network to operate and to be efficient. In this context, the Libp2p project provides public infrastructure to boost the network, enable nodes connectivity and improve constrained nodes performance. This public infrastructure should be leveraged for learning the concepts and experimenting. When an application on top of libp2p aims to move into production, its own infrastructure should be setup as the public nodes will be intensively used by others and its availability is not guaranteed.

This guide aims to guide you from using the public infrastructure into setting up your own.

## Table of Contents

* [Production](#production)
  * [Bootstrap nodes](#bootstrap-nodes)
  * [Star servers](#star-servers)
  * [Delegate nodes](#delegate-nodes)
  * [Circuit Relay](#circuit-relay)
  * [Rendezvous Server nodes](#rendezvous-server-nodes)

## Bootstrap nodes

TODO: Problem that solve...

## Star servers

TODO: Problem that solve...

## Delegate nodes

Libp2p nodes in a browser environment, in constrained devices, as well as in other scenarios, will not be an efficient node in the libp2p DHT overlay, as a consequence of their known limitations regarding connectivity and performance.

Aiming to support these type of nodes to find other peers and content in the network, delegate nodes can be setup. With a set of well known libp2p delegate nodes, nodes with limitations in the network can leverage them to perform peer and content routing calls.

You can read on how to setup your own set of delegated nodes in [DELEGATE_NODES.md](./DELEGATE_NODES.md).

## Circuit Relay

TODO: Problem that solve...

## Rendezvous Server nodes

TODO: Problem that solve...
