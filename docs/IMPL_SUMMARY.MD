# js-libp2p-kad-dht

js-libp2p-kad-dht is a JavaScript implementation of the [Kademlia DHT](http://www.scs.stanford.edu/%7Edm/home/papers/kpos.pdf) with some features of S/Kademlia. A "provider" node uses the DHT to advertise that it has a particular piece of content, and "querying" nodes will search the DHT for peers that have a particular piece of content. Content is modeled as a value that is identified by a key, where the key and value are Buffers.

#### DHT Identifiers

The DHT uses a sha2-256 hash for identifiers:
- For peers the DHT identifier is the hash of the [PeerId][PeerId]
- For content the DHT identifier is the hash of the key (eg a Block CID)

#### FIND_NODE

`findPeer (PeerId):` [PeerInfo][PeerInfo]

The address space is so large (256 bits) that there are big gaps between DHT ids, and nodes frequently join and leave the DHT.

To find a particular node
- the `querying node` converts the [PeerId][PeerId] to a DHT id
- the `querying node` sends a request to the nearest peers to that DHT id that it knows about
- those peers respond with the nearest peers to the DHT id that they know about
- the `querying node` sorts the responses and recursively queries the closest peers to the DHT id, continuing until it finds the node or it has queried all the closest peers.

#### PUT

`put (Key, Value)`

To store a value in the DHT, the `provider node`
- converts the key to a DHT id
- follows the "closest peers" algorithm as above to find the nearest peers to the DHT id
- sends the value to those nearest peers

Note that DHT nodes will only store values that are accepted by its "validators", configurable functions that validate the key/value to ensure the node can control what kind of content it stores (eg IPNS records).

#### GET

`get (Key): [Value]`

To retrieve a value from the DHT
- the `querying node` converts the key to a DHT id
- the `querying node` follows the "closest peers" algorithm to find the nearest peers to the DHT id
- at each iteration of the algorithm, if the peer has the value it responds with the value itself in addition to closer peers.

Note that the value for a particular key is stored by many nodes, and these nodes receive `PUT` requests asynchronously, so it's possible that nodes may have distinct values for the same key. For example if node A `PUT`s the value `hello` to key `greeting` and node B concurrently `PUT`s the value `bonjour` to key `greeting`, some nodes close to the key `greeting` may receive `hello` first and others may receive `bonjour` first.

Therefore a `GET` request to the DHT may collect distinct values (eg `hello` and `bonjour`) for a particular key from the nodes close to the key. The DHT has "selectors", configurable functions that choose the "best" value (for example IPNS records include a sequence number, and the "best" value is the record with the highest sequence number).

#### PROVIDE

`provide (Key)`

To advertise that it has the content for a particular key
- the `provider node` converts the key to a DHT id
- the `provider node` follows the "closest peers" algorithm to find the nearest peers to the DHT id
- the `provider node` sends a "provide" message to each of the nearest peers
- each of the nearest peers saves the association between the "provider" peer and the key

#### FIND_PROVIDERS

`findProviders (Key):` [[PeerInfo][PeerInfo]]

To find providers for a particular key
- the `querying node` converts the key to a DHT id
- the `querying node` follows the "closest peers" algorithm to find the nearest peers to the DHT id
- at each iteration of the algorithm, if the peer knows which nodes are providing the value it responds with the provider nodes in addition to closer peers.

[PeerId]: https://github.com/libp2p/js-peer-id
[PeerInfo]: https://github.com/libp2p/js-peer-info
