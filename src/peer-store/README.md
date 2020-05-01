# PeerStore

Libp2p's PeerStore is responsible for keeping an updated register with the relevant information of the known peers. It should be the single source of truth for all peer data, where a subsystem can learn about peers' data and where someone can listen for updates. The PeerStore comprises four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`.

The PeerStore manages the high level operations on its inner books. Moreover, the PeerStore should be responsible for notifying interested parties of relevant events, through its Event Emitter.

## Data gathering

Several libp2p subsystems will perform operations, which will gather relevant information about peers. Some operations might not have this as an end goal, but can also gather important data.

In a libp2p node's life, it will discover peers through its discovery protocols. In a typical discovery protocol, addresses of the peer are discovered along with its peer id. Once this happens, the PeerStore should collect this information for future (or immediate) usage by other subsystems. When the information is stored, the PeerStore should inform interested parties of the peer discovered (`peer` event).

Taking into account a different scenario, a peer might perform/receive a dial request to/from a unkwown peer. In such a scenario, the PeerStore must store the peer's multiaddr once a connection is established. 

After a connection is established with a peer, the Identify protocol will run automatically. A stream is created and peers exchange their information (Multiaddrs, running protocols and their public key). Once this information is obtained, it should be added to the PeerStore. In this specific case, as we are speaking to the source of truth, we should ensure the PeerStore is prioritizing these records. If the recorded `multiaddrs` or `protocols` have changed, interested parties must be informed via the `change:multiaddrs` or `change:protocols` events respectively.

In the background, the Identify Service is also waiting for protocol change notifications of peers via the IdentifyPush protocol. Peers may leverage the `identify-push` message to communicate protocol changes to all connected peers, so that their PeerStore can be updated with the updated protocols. As the `identify-push` also sends complete and updated information, the data in the PeerStore can be replaced.

(To consider: Should we not replace until we get to multiaddr confidence? we might loose true information as we will talk with older nodes on the network.)

While it is currently not supported in js-libp2p, future iterations may also support the [IdentifyDelta protocol](https://github.com/libp2p/specs/pull/176).

It is also possible to gather relevant information for peers from other protocols / subsystems. For instance, in `DHT` operations, nodes can exchange peer data as part of the `DHT` operation. In this case, we can learn additional information about a peer we already know. In this scenario the PeerStore should not replace the existing data it has, just add it.

## Data Consumption

When the PeerStore data is updated, this information might be important for different parties.

Every time a peer needs to dial another peer, it is essential that it knows the multiaddrs used by the peer, in order to perform a successful dial to it. The same is true for pinging a peer. While the `AddressBook` is going to keep its data updated, it will also emit `change:multiaddrs` events so that subsystems/users interested in knowing these changes can be notified instead of polling the `AddressBook`.

Everytime a peer starts/stops supporting a protocol, libp2p subsystems or users might need to act accordingly. `js-libp2p` registrar orchestrates known peers, established connections and protocol topologies. This way, once a protocol is supported for a peer, the topology of that protocol should be informed that a new peer may be used and the subsystem can decide if it should open a new stream with that peer or not. For these situations, the `ProtoBook` will emit `change:protocols` events whenever supported protocols of a peer change.

## PeerStore implementation

The PeerStore wraps four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`. Moreover, it provides a high level API for those components, as well as data events.

### Components

#### Address Book

The `addressBook` keeps the known multiaddrs of a peer. The multiaddrs of each peer may change over time and the Address Book must account for this.

`Map<string, Address>`

A `peerId.toString()` identifier mapping to a `Address` object, which should have the following structure:

```js
{
  multiaddr: <Multiaddr>
}
```

#### Key Book

The `keyBook` tracks the keys of the peers.

**Not Yet Implemented**

#### Protocol Book

The `protoBook` holds the identifiers of the protocols supported by each peer. The protocols supported by each peer are dynamic and will change over time.

`Map<string, Set<string>>`

A `peerId.toString()` identifier mapping to a `Set` of protocol identifier strings.

#### Metadata Book

**Not Yet Implemented**

### API

For the complete API documentation, you should check the [API.md](../../doc/API.md).

Access to its underlying books:

- `peerStore.protoBook.*`
- `peerStore.addressBook.*`

### Events

- `peer` - emitted when a new peer is added.
- `change:multiaadrs` - emitted when a known peer has a different set of multiaddrs.
- `change:protocols` - emitted when a known peer supports a different set of protocols.

## Data Persistence

The data stored in the PeerStore can be persisted if configured appropriately. Keeping a record of the peers already discovered by the peer, as well as their known data aims to improve the efficiency of peers joining the network after being offline.

The libp2p node will need to receive a [datastore](https://github.com/ipfs/interface-datastore), in order to store this data in a persistent way. A [datastore](https://github.com/ipfs/interface-datastore) stores its data in a key-value fashion. As a result, we need coherent keys so that we do not overwrite data.

The PeerStore should not be continuously updating the datastore with the new data observed. Accordingly, it should only store new data after reaching a certain threshold of "dirty" peers, as well as when the node is stopped.

Taking into account that a datastore allows queries using a key prefix, we can find all the information if we define a consistent namespace that allow us to find the content without having any information. The namespaces were defined as follows:

**AddressBook**

All the knownw peer addresses are stored with a key pattern as follows:

`/peers/addrs/<b32 peer id no padding>`

**ProtoBook**

All the knownw peer protocols are stored with a key pattern as follows:

`/peers/protos/<b32 peer id no padding>`

**KeyBook**

_NOT_YET_IMPLEMENTED_

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
