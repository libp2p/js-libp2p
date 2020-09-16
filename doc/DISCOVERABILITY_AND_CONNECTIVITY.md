# Discoverability and Connectivity

While different p2p applications have different needs and requirements, they might also run in different environments and have different hardware capabilities. These characteristics will influence how other peers can be discovered, as well as how connections are established and kept open.

This document contains a set of guidelines to setup libp2p for the most common use cases, in the context of the typical environments where you can run a `js-libp2p` node.

## Table of Contents

[Background](#background)
  - [Discovery](#discovery)
  - [Connectivity](#connectivity)
[Browser](#browser)
  - [Discovery](#discovery)
  - [Connectivity](#connectivity)
  - [Routing](#routing)
  - [Overview](#overview)
[Node](#node)

## Background

### Discovery

Libp2p offers a variety of options to discover other peers on the network. They range from specifying well known peer addresses, to issue queries in a local network or exchanging peer addresses with other previously discovered peers.

To enable peer addresses exchange, peers need to specify their own announce addresses. Accordingly, announce addresses should be reachable from other peers to be valuable.

### Connectivity

A libp2p node cannot keep a unlimited number of connections over time due to hardware and network constraints. As a consequence, a node must keep the most important connections open at any moment. While certain connections will probably be important over longer periods of time, others might only be important for a smaller interval. Accordingly, libp2p needs to keep track of its open connections over time and verify if there are better connections to establish while keeping an healthy number open.

Well known peers are important for bootstrapping and getting to know other peers in the network. However, they will become less important over time since their main purpose is usually to bootstrap the network and not to provide other services. Moreover, as they will be reached by most of the network, they should be disconnected when they do not provide any more clear value to keep the network healthy.

Libp2p is able to automatically identify the importance of some connections over time, but the application layer should also flag important connections manually to improve the node's sensing of the network. For instance, libp2p will protect connections that are used in their listening addresses, in order to be reachable by other nodes, as well as connections with relevant peers for core protocols like gossipsub. 

## Browser

Regarding enabling p2p applications, browsers currently have limitations that have impact on how libp2p should be setup.

### Discovery

Taking into account that a web browser does not offer any mDNS-like local discovery method to find peers on the same network and/or on the same web origin, a browser node will need to know other peers' addresses beforehand, so that it can bootstrap its network. These initial nodes should be used as a way to get to know other peers in the network and establish connections with them. Moreover, some of these peers can also advertise the browser peer to other nodes in the network, so that they can connect to it.

### Connectivity

Browser nodes do not have the ability to "listen" for incoming connections, nor a permanent address that can be dialed later for quick resume. However, Libp2p provides a set of possibilities to overcome these limitations. These solutions usually rely on other nodes to listen for connections on its behalf, as well as to advertise its information to other peers.

A browser node should start by establishing a connection with a known machine. As a result of this connection, the browser node will likely be interested to have its addresses announced to other peers in the network. Given that a browser cannot be dialed, the announced addresses of the node will be addresses that rely on this previously connection as the entry point of a dial request. For example, a circuit relay address from a connected peer. Shortly, browser nodes should have auto-relay enabled, so that they can bind to relay nodes that support HOP and become diable via them.

### Routing

DHTs are an essential building block of a p2p system to provide a lookup mechanism similar to a key-value hash table.

As browsers cannot handle large pools of open connections at the same time, as well as establish direct connections to each others, browser nodes cannot participate efficiently in DHTs. Once again, the best way to circumvent this limitation is to rely on more capable nodes in the network to handle DHT queries on their behalf. Browser nodes can rely on delegate nodes or use the DHT in client mode.

### Overview

The base connections to have a fully functional libp2p browser node are:
- nodes that can listen for incoming connections
  - Relay nodes, Webrtc-star servers, ...
- nodes that can enable peer discovery and service discovery
  - Webrtc-star servers, Rendezvous servers, DHT server Nodes, ...
- closest nodes
- nodes that can enable efficient routing
  - DHT server nodes
- nodes from the pubsub topics mesh
- application protocol peers (as needed via `MulticodecTopology`)

While the first three points are important in any context, the last three points depend on the application use case and if the mentioned subsystems are needed. 

TODO: Clearly define what libp2p handles and how it is handled

- Libp2p will protect connections used in their listening addresses like connections to a `webrtc-star` server or connections to a node acting as a relay through the `AutoRelay`, as well as nodes used for peer and service discovery
- Libp2p pubsub routers will protect the most important peer connections
  - How to control and avoid excess
- Libp2p will protect connections to n DHT servers
- Libp2p will protect the n (configurable) closest peers on the network and refresh them over time, if needed
- Application protocol peers should be protected
  - TODO: define how

## Node

In a Node.js context, there are less limitations that need to be considered regarding discoverability and connectivity compared to browser nodes.

The most common issue is when Libp2p nodes are behind NATs. While NAT is usually transparent for outgoing connections, listening for incoming connections might require some configuration. While it’s usually possible to manually configure routers, not everyone that wants to run a peer-to-peer application or other network service will have the ability to do so. Moreover, libp2p applications should run everywhere, not just in data centers or on machines with stable public IP addresses.

The best approach at the moment to circumvent this limitation is to rely on relay to communicate indirectly via an intermediary peer.

### Overview

The base connections to have a fully functional libp2p browser node are:
- nodes that can listen for incoming connections when behind a NAT
  - Relay nodes, ...
- nodes that can enable service discovery
  - Rendezvous servers, DHT server Nodes, ...
- closest nodes
- nodes that can enable efficient routing
  - DHT server nodes
- nodes from the pubsub topics mesh
- application protocol peers (as needed via `MulticodecTopology`)
