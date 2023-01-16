# Peer Discovery and Auto Dial

**Synopsis**:

- All peers discovered are emitted via `peer:discovery` so applications can take any desired action.
- Libp2p defaults to automatically connecting to peers stored in the peer store, when the number of connections falls below the `minConnections` set in the [ConnectionManager](https://libp2p.github.io/js-libp2p-interfaces/modules/_libp2p_interface_connection_manager.html)
  - Applications can disable this via the `connectionManager.autoDial` config property, and handle connections themselves.
  - Applications who have not disabled this should **never** connect on peer discovery. Applications should use the `peer:connect` event if they wish to take a specific action on new peers.

## Scenarios

### 1. Joining the network

The node is new and needs to join the network. It currently has 0 peers.
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery)

### Action to take

Connect to discovered peers. This should have some degree of concurrency limiting. While the case should be low, if we immediately discover more peers than our `maxOutgoingConnections` we should avoid dialing them all.

### 2. Connected to some

The node is connected to other nodes. The current number of connections is less than the desired `minConnections`.
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take

Connect to discovered peers. This should have some degree of concurrency limiting. The concurrency may need to be modified to reflect the current number of peers connected. The more peers we have, the lower the concurrency may need to be.

### 3. Connected to enough

**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take

None. If we are connected to enough peers i.e. the `minConnections`, we should not connect to any more peers. As other peers discover us, they may connect to us based on their current scenario.

For example, a long running node with adequate peers is on an MDNS network. A new peer joins the network and both become aware of each other. The new peer should be the peer that dials, as it has too few peers. The existing node has no reason to dial the new peer, but should keep a record of it in case it later becomes an important node due to its contents/capabilities.

Avoiding dials above the `minConnections` also allows for a pool of connections to be reserved for application specific actions, such as connecting to a specific content provider via a DHT query to find that content (ipfs-bitswap).

### 4. Connected to too many

The node has more connections than it wants. The current number of connections is greater than the `maxOutgoingConnections`.

[WIP Connection Manager v2 spec](https://github.com/libp2p/specs/pull/161)
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take

None, the `ConnectionManager` will automatically prune connections.

## Discovery Mechanisms

Means of which a libp2p node discovers other peers.

### Active Discovery

Through active use of the libp2p network, a node may discovery peers.

- Content/Peer routing (DHT, delegated, etc) provider and peer queries
- DHT random walk
- Rendezvous servers

### Ambient Discovery

Leveraging known addresses, or network discovery mechanisms, a node may discover peers outside of the bounds of the libp2p network.

- Bootstrap
- MDNS
- proximity based (bluetooth, sound, etc)
