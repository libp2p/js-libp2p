# Peerstore

Libp2p's Peerstore is responsible for keeping an updated register with the relevant information of the known peers. It should gather environment changes and be able to take decisions and notice interested parties of relevant changes. The Peerstore comprises four main components: `addressBook`, `keyBook`, `protocolBook` and `metadataBook`. These book components have similar characteristics with the `Javascript Map` implementation.

The PeerStore needs to manage the high level operations on its inner books, have a job runner to trigger other books runners for data trimming or computations. Moreover, the peerStore should be responsible for noticing interested parties of relevant events, through its Event Emitter.

## Peers Environment

#### Sense

Several libp2p subsystems will perform operations, which will gather relevant information about peers. Some operations might not have this as an end goal, but can also gather important data.

In a libp2p node life, it will discover peers the existance of peers through its discovery protocols. In a typical discovery protocol, an address of the peer is discovered combined with its peer id. Once this happens, the `PeerStore` should collect this information for future (or immediate) usage by other subsystems. When the information is stored, the `PeerStore` should inform interested parties of the peer discovered (`peer` event).

Taking into account a different scenario, a peer might perform/receive a dial request to/from a unkwown peer. In such a scenario, the `PeerStore` must store the peer's multiaddr once a connection is established. 

(NOTE: this should be removed later)
(currently we silently put it to the peerStore, without emitting events, as this logic exists in the `onConnected` callback from the upgrader. This way, we are never emitting the `peer` event when inbound connections happen, or a unkwown peer is dialed. Should we differentiate this?)

After a connection is established with a peer, the Identify Service will act on this connection. A stream is created and peers exchange their information (listenMuldiaddrs and running protocols). Once this information is obtained, the PeerStore can collect the new data. In this specific case, we have a guarantee that this data is complete and updated, so the data stored in the PeerStore should be replaced (older and outdated data should disappear). However, if the recorded `multiaddrs` or `protocols` have changed, interested parties must be informed via `change:multiaddrs` or `change:protocols` events.

In the background, the Identify Service is also waiting for new protocols to be started by the peer. If a new protocol is started, the `identify-push` message is sent to all the connected peers, so that their PeerStore can be updated with the new protocol and relevant parties are noticed. As the `identify-push` also sends complete and updated information, the data in the PeerStore is replaced.

On different context, it is also possible to gather relevant information for the peers. For instance, in `dht` operations, nodes can exchanges data of peers they know as part of the `dht` operation. In this case, we can get information from a peer that we already know. As a consequence, the `PeerStore` should act accordingly and not replace the data it owns, but just try to merge it the discovered data is new. For example, discovered a new address of a peer.

#### Act

When the `PeerStore` data is updated, this information might be important for different parties.

`js-libp2p` keeps a topology of peers for each protocol a node is running. This way, once a protocol is supported for a peer, the topology of that protocol should be informed that a new peer may be used and the subsystem can decide if it should open a new stream it that peer or not.

Every time a peer needs to dial another peer, it is essential that it knows the multiaddrs used by the peer, in order to perform a successful dial to a peer. The same is true for pinging a peer.

## PeerStore implementation

(Note: except for highlighting the APIs functionallity, they should be better formally described on `API.md` file)

#### API:

Access to its underlying books:

- `peerStore.protoBook.*`
- `peerStore.addressBook.*`

High level operations:

- `peerStore.set(peerId, data, options)` or `events`

High level set which should be able to identify the type of data received and forward to the appropriate book sets. More than a bridge, this aims to allow the combination of multiple data storage as follows:

`data = { multiaddrs: [...], protocols: [...] }`

---- (should be removed / re-written, but important for design decisions)

One aspect that we need to consider is wether we should add information to every book, even if we don't have any relevant information for it. For instance, if we just discover a peer via a typical discovery service, we will have the `peerId` and an array of `multiaddr`. When we do `peerStore.set()`, should we also do `protoBook.set()` with an empty list of protocols? I don't see any advantage on adding to the remaining ones.

**IMPORTANT:** This is one of the biggest design decisions to make (set vs events). The programmatic API is the easiest solution but it can provide users an API that they sould not need. If we go on an event-based approach, the `peerStore` should receive all the relevant subsystems (discovery, identifyService, ...) and sense the environment (via events) to gather the information that would need to be sent via the API. Thile the latest seems the best solution, it is the more complex one to implement, as we would ideally have an interface that those subsystems would need to implement and each time we have a new subsystem that needs to add data to the peerStore, we might need to update the `peer-store` codebase (or have a good set of abstractions).

It is also important pointing out that users would be able to use `peerStore.protoBook.*`, so eventually we should move those into `peerStore._ protoBook.*` if we do not intend them to use it.

---

- `peerStore.get(peerId, options)`

Get the information of a provided peer. The amount of information that we want can be customized with the following options, which are true by default:

```js
{
  address: true,
  proto: true,
  key: true,
  metadata: true
}
```

- `peerStore.delete(peerId, [data])`

Deletes the provided peer from every book. If data is provided, just remove the data from the books. The data should be provided as follows:

```js
{
  address: [],
  proto: [],
  key: [],
  metadata: []
}
```

- `peerStore.peers(options)`

Get an array of all the peers, as well as their information. The information intended can be customized with the following options, which are true by default:

```js
{
  address: true,
  proto: true,
  key: true,
  metadata: true
}
```

## Address Book

The `addressBook` keeps the known multiaddrs of a peer. The multiaddrs of each peer are not a constant and the Address book must have this into consideration.

`Map<string, multiaddrInfo>`

A `peerId.toString()` identifier mapping to a `multiaddrInfo` object, which should have the following structure:

```js
{
  multiaddr: ,
  validity: ,
  confidence: 
}
```

**Note:** except for multiaddr namings, the other properties are placeholders for now and might not be as described in the future milestones.

- `addressBook.set()`
- `addressBook.get()`
- `getMultiaddrsForPeer()`
- `addressBook.has()`
- `addressBook.delete()`
- `addressBook.peers()`

It is important pointing out that the API methods which return arrays of data (`set`, `get`, `getMultiaddrsForPeer`) shuld return the `multiaddr` property of the `multiaddrInfo` and not the entire `multiaddrInfo` as the remaining data should be used internally. Should we consider having two datastructure instead?

Further API methods will probably be added in the context of multiaddr `ttl` and multiaddr confidence.

**Not Yet Implemented**: Multiaddr Confidence

## Key Book

The `keyBook` tracks the keys of the peers.

**Not Yet Implemented**

## Protocol Book

The `protoBook` holds the identifiers of the protocols supported by each peer. The protocols supported by each peer are dynamic and will change over time.

`Map<string, Set<string>>`

A `peerId.toString()` identifier mapping to a `Set` of protocol identifier strings.

- `protoBook.set()`
- `protoBook.get()`
- `protoBook.has()`
- `protoBook.delete()`
- `protoBook.supports()`
- `protoBook.peers()`

## Metadata Book

**Not Yet Implemented**
