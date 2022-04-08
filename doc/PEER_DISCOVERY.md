# Peer Discovery and Auto Dial

**Synopsis**:
* All peers discovered are emitted via `peer:discovery` so applications can take any desired action.
* Libp2p defaults to automatically connecting to new peers, when under the [ConnectionManager](https://github.com/libp2p/js-libp2p-connection-manager) low watermark (minimum peers).
  * Applications can disable this via the `connectionManager.autoDial` config property, and handle connections themselves.
  * Applications who have not disabled this should **never** connect on peer discovery. Applications should use the `peer:connect` event if they wish to take a specific action on new peers.

## Scenarios
In any scenario, if a peer is discovered it should be added to the PeerBook. This ensures that even if we don't dial to a node when we discover it, we know about it in the event that it becomes known as a provider for something we need. The scenarios listed below detail what actions the auto dialer will take when peers are discovered.

### 1. Joining the network
The node is new and needs to join the network. It currently has 0 peers.
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery)

### Action to take
Connect to discovered peers. This should have some degree of concurrency limiting. While the case should be low, if we immediately discover more peers than our high watermark we should avoid dialing them all.

### 2. Connected to some
The node is connected to other nodes. The current number of connections is less than the desired low watermark.
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take
Connect to discovered peers. This should have some degree of concurrency limiting. The concurrency may need to be modified to reflect the current number of peers connected. The more peers we have, the lower the concurrency may need to be.

### 3. Connected to enough
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take
None. If we are connected to enough peers, the low watermark, we should not connect to discovered peers. As other peers discover us, they may connect to us based on their current scenario.

For example, a long running node with adequate peers is on an MDNS network. A new peer joins the network and both become aware of each other. The new peer should be the peer that dials, as it has too few peers. The existing node has no reason to dial the new peer, but should keep a record of it in case it later becomes an important node due to its contents/capabilities.

Avoiding dials above the low watermark also allows for a pool of connections to be reserved for application specific actions, such as connecting to a specific content provider via a DHT query to find that content (ipfs-bitswap).

### 4. Connected to too many
The node has more connections than it wants. The current number of connections is greater than the high watermark.

[WIP Connection Manager v2 spec](https://github.com/libp2p/specs/pull/161)
**Discovery Mechanisms**: [Ambient Discovery](#ambient-discovery) and [Active Discovery](#active-discovery)

### Action to take
None, the `ConnectionManager` will automatically prune connections.

## Discovery Mechanisms
Means of which a libp2p node discovers other peers.

### Active Discovery
Through active use of the libp2p network, a node may discovery peers.

* Content/Peer routing (DHT, delegated, etc) provider and peer queries
* DHT random walk
* Rendezvous servers

### Ambient Discovery
Leveraging known addresses, or network discovery mechanisms, a node may discover peers outside of the bounds of the libp2p network.

* Bootstrap
* MDNS
* proximity based (bluetooth, sound, etc)
