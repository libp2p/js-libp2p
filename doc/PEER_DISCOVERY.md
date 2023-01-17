# Peer Discovery and Auto Dial <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Synopsis](#synopsis)
- [Scenarios](#scenarios)
  - [1. Joining the network](#1-joining-the-network)
    - [Action to take](#action-to-take)
  - [2. Connected to some](#2-connected-to-some)
    - [Action to take](#action-to-take-1)
  - [3. Connected to enough](#3-connected-to-enough)
    - [Action to take](#action-to-take-2)
  - [4. Connected to too many](#4-connected-to-too-many)
    - [Action to take](#action-to-take-3)
- [Discovery Mechanisms](#discovery-mechanisms)
  - [Active Discovery](#active-discovery)
  - [Ambient Discovery](#ambient-discovery)

## Synopsis

* All peers discovered are emitted via the `peer:discovery` event so applications can take any desired action
* To ensure reasonable resource usage, discovered peers are not connected to automatically
* Applications should lisen for the `peer:connect` event if they wish to take a specific action when new connections are established
* Libp2p functions best with a good number of network connections to a diverse set of peers. When the number of connected peers a node has falls under the [ConnectionManager](./CONFIGURATION.md#configuring-connection-manager) `minConnections` setting, randomly selected peers from the peer store will be dialed until the node's number of connections rises above this number.
  * Applications can disable this behaviour via the `connectionManager.autoDial` config property, and handle increasing the current number of connections themselves

## Scenarios

The scenarios listed below detail what actions libp2p will take when peers are discovered.

In any scenario, if a peer is discovered it is added to the peer store. This ensures that we know about the peer in the event that it becomes known as a provider for something we need, even if we don't have a direct connection to it at the time.

### 1. Joining the network

The node is new and needs to join the network. It currently has 0 peers.

#### Action to take

Connect to more peers.

* Configured [Ambient Discovery](#ambient-discovery) mechanisms may begin discovering peers
* The node will run a network query for it's own PeerId which will discover nodes that are [KAD-close](https://en.wikipedia.org/wiki/Kademlia) to it's own ID
* It will search the peer store and dial and peers previously tagged with `KEEP_ALIVE`

### 2. Connected to some

The node is connected to other nodes. The current number of connections is fewer than the desired amount, expressed as the [ConnectionManager](./CONFIGURATION.md#configuring-connection-manager) `minConnections` setting, also referred to as the low watermark.

#### Action to take

Connect to more peers.

* The node will select nodes from the peer store and dial them until the number of connections is above the low watermark
* Configured [Ambient Discovery](#ambient-discovery) mechanisms may continue discovering peers
* The node will periodically run a network query for it's own PeerId which will discover nodes that are [KAD-close](https://en.wikipedia.org/wiki/Kademlia) to it's own ID

### 3. Connected to enough

The number of peers the node has is above the low watermark and below the high watermark.

#### Action to take

None. As other peers discover us, they may connect to us based on their current scenario.

For example, a long running node with adequate peers is on an MDNS network. A new peer joins the network and both become aware of each other. The new peer should be the peer that dials, as it has too few peers. The existing node has no reason to dial the new peer, but should keep a record of it in case it later becomes an important node due to its contents/capabilities.

Avoiding dials above the low watermark also allows for a pool of connections to be reserved for application specific actions, such as connecting to a specific content provider via a DHT query to find that content (ipfs-bitswap).

### 4. Connected to too many

The node has more connections than it wants. The current number of connections is greater than the desired amount, expressed as the [ConnectionManager](./CONFIGURATION.md#configuring-connection-manager) `maxConnections` setting, also referred to as the high watermark.

#### Action to take

The `ConnectionManager` will automatically prune connections.

It ranks peers based on their tags and the duration of the connection. Tags with lower values and shorter lived connections are pruned first.

## Discovery Mechanisms
Means of which a libp2p node discovers other peers.

### Active Discovery
Through active use of the libp2p network, a node may discovery peers.

* Content/Peer routing (DHT, delegated, etc) provider and peer queries
* DHT queries - network traversal can pass through previously unknown nodes

### Ambient Discovery
Leveraging known addresses, or network discovery mechanisms, a node may discover peers outside of the bounds of the libp2p network.

* Bootstrap - a list of known peers
* MDNS - local network discovery
* Proximity based (bluetooth, sound, etc) - not currently implemented
