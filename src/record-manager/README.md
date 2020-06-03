# Record Manager

All libp2p nodes keep a `PeerStore`, that among other information stores a set of known addresses for each peer. Addresses for a peer can come from a variety of sources.

Libp2p peer records were created to enable the distributiion of verifiable address records, which we can prove originated from the addressed peer itself. 

With such guarantees, libp2p can prioritize addresses based on their authenticity, with the most strict strategy being to only dial certified addresses.

The libp2p record manager is responsible for keeping a local peer record updated, as well as to inform third parties of possible updates. (TODO: REMOVE and modules: Moreover, it provides an API for the creation and validation of libp2p **envelopes**.)

## Envelop

Libp2p nodes need to store data in a public location (e.g. a DHT), or rely on potentially untrustworthy intermediaries to relay information over its lifetime. Accordingly, libp2p nodes need to be able to verify that the data came from a specific peer and that it hasn't been tampered with.

Libp2p provides an all-purpose data container called **envelope**, which includes a signature of the data, so that its authenticity can be verified. This envelope stores a marshaled record implementing the [interface-record](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/record).

Envelope signatures can be used for a variety of purposes, and a signature made for a specific purpose IS NOT be considered valid for a different purpose. We separate signatures into `domains` by prefixing the data to be signed with a string unique to each domain. This string is not contained within the envelope data. Instead, each libp2p subsystem that makes use of signed envelopes will provide their own domain string when creating the envelope, and again when validating the envelope. If the domain string used to validate it is different from the one used to sign, the signature validation will fail.

## Records

The Records are designed to be serialized to bytes and placed inside of the envelopes before being shared with other peers.

### Peer Record

A peer record contains the peers' publicly reachable listen addresses, and may be extended in the future to contain additional metadata relevant to routing.

Each peer record contains a `seq` field, so that we can order peer records by time and identify if a received record is more recent than the stored one.

They should be used either through a direct exchange (as in th libp2p identify protocol), or through a peer routing provider, such as a DHT. 

## Libp2p flows

Once a libp2p node has started and is listening on a set of multiaddrs, the **Record Manager** will kick in, create a peer record for the peer and wrap it inside a signed envelope. Everytime a libp2p subsystem needs to share its peer record, it will get the cached computed peer record and send its envelope.

**_NOT_YET_IMPLEMENTED_** While creating peer records is fairly trivial, addresses should not be static and can be modified at arbitrary times. When a libp2p node changes its listen addresses, the **Record Manager** will compute a new peer record, wrap it inside a signed envelope and inform the interested subsystems.

Considering that a node can discover other peers' addresses from a variety of sources, Libp2p Peerstore should be able to differentiate the addresses that were obtained through a signed peer record. Once all these pieces are in place, we will also need a way to prioritize addresses based on their authenticity, that is, the dialer can prioritize self-certified addresses over addresses from an unknown origin.

When a libp2p node receives a new signed peer record, the `seq` number of the record must be compared with potentially stored records, so that we do not override correct data,

### Notes:

- Possible design for AddressBook

```
addr_book_record
  \_ peer_id: bytes
  \_ signed_addrs: []AddrEntry
  \_ unsigned_addrs: []AddrEntry
  \_ certified_record
      \_ seq: bytes
      \_ raw: bytes
```

## Future Work

- Peers may not know their own addresses. It's often impossible to automatically infer one's own public address, and peers may need to rely on third party peers to inform them of their observed public addresses.
- A peer may inadvertently or maliciously sign an address that they do not control. In other words, a signature isn't a guarantee that a given address is valid.
- Some addresses may be ambiguous. For example, addresses on a private subnet are valid within that subnet but are useless on the public internet.
- Modular dialer? (taken from go PR notes)
  - With the modular dialer, users should easily be able to configure precedence. With dialer v1, anything we do to prioritise dials is gonna be spaghetti and adhoc. With the modular dialer, you’d be able to specify the order of dials when instantiating the pipeline.
  - Multiple parallel dials. We already have the issue where new addresses aren't added to existing dials.