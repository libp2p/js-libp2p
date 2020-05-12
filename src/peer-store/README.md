# PeerStore

Libp2p's PeerStore is responsible for keeping an updated register with the relevant information of the known peers. It should be the single source of truth for all peer data, where a subsystem can learn about peers' data and where someone can listen for updates. The PeerStore comprises four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`.

The PeerStore manages the high level operations on its inner books. Moreover, the PeerStore should be responsible for notifying interested parties of relevant events, through its Event Emitter.

## Submitting records to the PeerStore

Several libp2p subsystems will perform operations that might gather relevant informations about peers.

### Identify
- The Identify protocol automatically runs on every connection when multiplexing is enabled. The protocol will put the multiaddrs and protocols provided by the peer to the PeerStore.
- In the background, the Identify Service is also waiting for protocol change notifications of peers via the IdentifyPush protocol. Peers may leverage the `identify-push` message to communicate protocol changes to all connected peers, so that their PeerStore can be updated with the updated protocols.
- While it is currently not supported in js-libp2p, future iterations may also support the [IdentifyDelta protocol](https://github.com/libp2p/specs/pull/176).
- Taking into account that the Identify protocol records are directly from the peer, they should be considered the source of truth and weighted accordingly.

### Peer Discovery
- Libp2p discovery protocols aim to discover new peers in the network. In a typical discovery protocol, addresses of the peer are discovered along its peer id. Once this happens, a libp2p discovery protocol should emit a `peer` event with the information of the discovered peer and this information it added to the PeerStore by libp2p.

### Dialer
- Libp2p API supports dialing a peer through its `multiaddr`. This way, if the node is able to establish a connection with the peer listening on the given `multiaddr`, this peer and its multiaddr should be added to the PeerStore.
- When a connection is being upgraded, more precisely after its encryption, or even in a discovery protocol, a libp2p node can get to know other parties public keys. In this scenario, libp2p will add the peer's public key to its `KeyBook`.

### DHT
- On some DHT operations, such as finding providers for a given CID, nodes can exchange peer data as part of the query. This peer data can include unkwown peers multiaddrs and is also stored on the PeerStore.

## Retrieving records from the PeerStore

When data in the PeerStore is updated the PeerStore will emit events based on the changes, to allow applications and other subsystems to take action on those changes. Any subsystem interested in these notifications should subscribe the [`PeerStore events`][peer-store-events].

### Peer
- Each time a new peer is discovered, the PeerStore should emit a [`peer` event][peer-store-events], so that interested parties can leverage this peer and establish a connection with it.

### Protocols
- When the known protocols of a peer change, the PeerStore emits a [`change:protocols` event][peer-store-events].
  - Libp2p topologies will be particularly interested in this, so that the subsystem can open streams with relevant peers for them

### Multiaddrs
- When the known listening `multiaddrs` of a peer change, the PeerStore emits a [`change:multiaddrs` event][peer-store-events].

## PeerStore implementation

The PeerStore wraps four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`. Moreover, it provides a high level API for those components, as well as data events.

### Components

#### Address Book

The `addressBook` keeps the known multiaddrs of a peer. The multiaddrs of each peer may change over time and the Address Book must account for this.

`Map<string, Address>`

A `peerId.toB58String()` identifier mapping to a `Address` object, which should have the following structure:

```js
{
  multiaddr: <Multiaddr>
}
```

#### Key Book

The `keyBook` tracks the public keys of the peers by keeping their [`PeerId`][peer-id].

`Map<string, PeerId`

A `peerId.toB58String()` identifier mapping to a `PeerId` of the peer. This instance contains the peer public key.

#### Protocol Book

The `protoBook` holds the identifiers of the protocols supported by each peer. The protocols supported by each peer are dynamic and will change over time.

`Map<string, Set<string>>`

A `peerId.toB58String()` identifier mapping to a `Set` of protocol identifier strings.

#### Metadata Book

**Not Yet Implemented**

### API

For the complete API documentation, you should check the [API.md](../../doc/API.md).

Access to its underlying books:

- `peerStore.addressBook.*`
- `peerStore.keyBook.*`
- `peerStore.protoBook.*`

### Events

- `peer` - emitted when a new peer is added.
- `change:multiaadrs` - emitted when a known peer has a different set of multiaddrs.
- `change:protocols` - emitted when a known peer supports a different set of protocols.

## Data Persistence

The data stored in the PeerStore can be persisted if configured appropriately. Keeping a record of the peers already discovered by the peer, as well as their known data aims to improve the efficiency of peers joining the network after being offline.

The libp2p node will need to receive a [datastore](https://github.com/ipfs/interface-datastore), in order to persist this data across restarts. A [datastore](https://github.com/ipfs/interface-datastore) stores its data in a key-value fashion. As a result, we need coherent keys so that we do not overwrite data.

The PeerStore should not continuously update the datastore whenever data is changed. Instead, it should only store new data after reaching a certain threshold of "dirty" peers, as well as when the node is stopped, in order to batch writes to the datastore.

The peer id will be appended to the datastore key for each data namespace. The namespaces were defined as follows:

**AddressBook**

All the known peer addresses are stored with a key pattern as follows:

`/peers/addrs/<b32 peer id no padding>`

**ProtoBook**

All the known peer protocols are stored with a key pattern as follows:

`/peers/protos/<b32 peer id no padding>`

**KeyBook**

All public keys are stored under the following pattern:

` /peers/keys/<b32 peer id no padding>`

**MetadataBook**

_NOT_YET_IMPLEMENTED_

Metadata is stored under the following key pattern:

`/peers/metadata/<b32 peer id no padding>/<key>`

## Future Considerations

- If multiaddr TTLs are added, the PeerStore may schedule jobs to delete all addresses that exceed the TTL to prevent AddressBook bloating
- Further API methods will probably need to be added in the context of multiaddr validity and confidence.
- When improving libp2p configuration for specific runtimes, we should take into account the PeerStore recommended datastore.
- When improving libp2p configuration, we should think about a possible way of allowing the configuration of Bootstrap to be influenced by the persisted peers, as a way to decrease the load on Bootstrap nodes.

[peer-id]: https://github.com/libp2p/js-peer-id
[peer-store-events]: ../../doc/API.md#libp2ppeerstore
