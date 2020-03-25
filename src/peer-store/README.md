# Peerstore

Libp2p's Peerstore is responsible for keeping an updated register with the relevant information of the known peers. It should gather environment changes and be able to take decisions and notice interested parties of relevant changes. The Peerstore comprises four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`. These book components have similar characteristics with the `Javascript Map` implementation.

The PeerStore needs to manage the high level operations on its inner books. Moreover, the peerStore should be responsible for notifying interested parties of relevant events, through its Event Emitter.

(Future considerations: Peerstore should manage a job runner to trigger books runners for data trimming or computations)

## Data gathering

Several libp2p subsystems will perform operations, which will gather relevant information about peers. Some operations might not have this as an end goal, but can also gather important data.

In a libp2p node's life, it will discover peers through its discovery protocols. In a typical discovery protocol, addresses of the peer are discovered along with its peer id. Once this happens, the `PeerStore` should collect this information for future (or immediate) usage by other subsystems. When the information is stored, the `PeerStore` should inform interested parties of the peer discovered (`peer` event).

Taking into account a different scenario, a peer might perform/receive a dial request to/from a unkwown peer. In such a scenario, the `PeerStore` must store the peer's multiaddr once a connection is established. 

(NOTE: this should be removed later)
(currently we silently put it to the peerStore, without emitting events, as this logic exists in the `onConnected` callback from the upgrader. This way, we are never emitting the `peer` event when inbound connections happen, or a unkwown peer is dialed. Should we differentiate this?)

After a connection is established with a peer, the Identify protocol will run automatically. A stream is created and peers exchange their information (Multiaddrs, running protocols and their public key). Once this information is obtained, it should be added to the PeerStore. In this specific case, as we are speaking to the source of truth, we should ensure the PeerStore is prioritizing these records. If the recorded `multiaddrs` or `protocols` have changed, interested parties must be informed via the `change:multiaddrs` or `change:protocols` events respectively.

In the background, the Identify Service is also waiting for protocol change notifications of peers via the IdentifyPush protocol. Peers may leverage the `identify-push` message to communicate protocol changes to all connected peers, so that their PeerStore can be updated with the updated protocols. As the `identify-push` also sends complete and updated information, the data in the PeerStore can be replaced.

While it is currently not supported in js-libp2p, future iterations may also support the [IdentifyDelta protocol](https://github.com/libp2p/specs/pull/176).

It is also possible to gather relevant information for peers from other protocols / subsystems. For instance, in `DHT` operations, nodes can exchange peer data as part of the `DHT` operation. In this case, we can learn additional information about a peer we already know. In this scenario the `PeerStore` should not replace the existing data it has, just add it.

## Data Consumption

When the `PeerStore` data is updated, this information might be important for different parties.

Every time a peer needs to dial another peer, it is essential that it knows the multiaddrs used by the peer, in order to perform a successful dial to a peer. The same is true for pinging a peer. While the `AddressBook` is going to keep its data updated, it will also emit `change:multiaddrs` events so that subsystems/users interested in knowing these changes can be notifyied instead of pooling the `AddressBook`.

Everytime a peer starts/stops supporting a protocol, libp2p subsystems or users might need to act accordingly. `js-libp2p` registrar orchestrates known peers, established connections and protocol topologies. This way, once a protocol is supported for a peer, the topology of that protocol should be informed that a new peer may be used and the subsystem can decide if it should open a new stream with that peer or not. For these situations, the `ProtoBook` will emit `change:protocols` events whenever supported protocols of a peer change.

## PeerStore implementation

(Note: except for highlighting the APIs functionallity, they should be better formally described on `API.md` file)

#### API:

Access to its underlying books:

- `peerStore.protoBook.*`
- `peerStore.addressBook.*`

High level operations:

- `peerStore.delete(peerId)`

Deletes the provided peer from every book.

- `peerStore.find(peerId)`

TODO (Move to API.doc and reference)

- `peerStore.peers()`

Get an array of all the peers, as well as their information.

## Address Book

The `addressBook` keeps the known multiaddrs of a peer. The multiaddrs of each peer may change over time and the Address Book must account for this.

`Map<string, multiaddrInfo>`

A `peerId.toString()` identifier mapping to a `multiaddrInfo` object, which should have the following structure:

```js
{
  multiaddr: ,
  validity: ,
  confidence: 
}
```

**Note:** except for multiaddr naming, the other properties are placeholders for now and might not be as described in the future milestones.

- `addressBook.data`
- `addressBook.set()`
- `addressBook.get()`
- `addressBook.getMultiaddrsForPeer()`
- `addressBook.delete()`

It is important pointing out that the API methods which return arrays of data (`set`, `get`, `getMultiaddrsForPeer`) should return the `multiaddr` property of the `multiaddrInfo` and not the entire `multiaddrInfo` as the remaining data should be used internally.

(Future considerations: Further API methods will probably be added in the context of multiaddr `ttl` and multiaddr confidence.)

**Not Yet Implemented**: Multiaddr Confidence

## Key Book

The `keyBook` tracks the keys of the peers.

**Not Yet Implemented**

## Protocol Book

The `protoBook` holds the identifiers of the protocols supported by each peer. The protocols supported by each peer are dynamic and will change over time.

`Map<string, Set<string>>`

A `peerId.toString()` identifier mapping to a `Set` of protocol identifier strings.

- `protoBook.data`
- `protoBook.set()`
- `protoBook.get()`
- `protoBook.delete()`
- `protoBook.supports()`

## Metadata Book

**Not Yet Implemented**
