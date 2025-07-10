# @libp2p/peer-record

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Used to transfer signed peer data across the network

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

Libp2p nodes need to store data in a public location (e.g. a DHT), or rely on potentially untrustworthy intermediaries to relay information over its lifetime. Accordingly, libp2p nodes need to be able to verify that the data came from a specific peer and that it hasn't been tampered with.

## Envelope

Libp2p provides an all-purpose data container called **envelope**. It was created to enable the distribution of verifiable records, which we can prove originated from the addressed peer itself. The envelope includes a signature of the data, so that its authenticity is verified.

This envelope stores a marshaled record implementing the [interface-record](https://github.com/libp2p/js-libp2p/blob/main/packages/interface/src/record/index.ts). These Records are designed to be serialized to bytes and placed inside of the envelopes before being shared with other peers.

You can read further about the envelope in [RFC 0002 - Signed Envelopes](https://github.com/libp2p/specs/blob/master/RFC/0002-signed-envelopes.md). For the original discussion about it you can look at the PR that was used to create it: [libp2p/specs#217](https://github.com/libp2p/specs/pull/217).

## Example - Creating a peer record

Create an envelope with an instance of an [interface-record](https://github.com/libp2p/js-libp2p/blob/main/packages/interface/src/record/index.ts) implementation and prepare it for being exchanged:

```TypeScript
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'

const privateKey = await generateKeyPair('Ed25519')
const peerId = peerIdFromPrivateKey(privateKey)

const record = new PeerRecord({
   peerId,
  // ...other data
})

const envelope = await RecordEnvelope.seal(record, privateKey)
const wireData = envelope.marshal()
```

## Example - Consuming a peer record

Consume a received envelope `wireData` and transform it back to a record:

```TypeScript
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'

const wireData = Uint8Array.from([0, 1, 2, 3, 4])
const envelope = await RecordEnvelope.openAndCertify(wireData, PeerRecord.DOMAIN)

const record = PeerRecord.createFromProtobuf(envelope.payload)
```

## Peer Record

All libp2p nodes keep a `PeerStore`, that among other information stores a set of known addresses for each peer, which can come from a variety of sources.

Libp2p peer records were created to enable the distribution of verifiable address records, which we can prove originated from the addressed peer itself. With such guarantees, libp2p is able to prioritize addresses based on their authenticity, with the most strict strategy being to only dial certified addresses (no strategies have been implemented at the time of writing).

A peer record contains the peers' publicly reachable listen addresses, and may be extended in the future to contain additional metadata relevant to routing. It also contains a `seqNumber` field, a timestamp per the spec, so that we can verify the most recent record.

You can read further about the Peer Record in [RFC 0003 - Peer Routing Records](https://github.com/libp2p/specs/blob/master/RFC/0003-routing-records.md). For the original discussion about it you can view the PR that created the RFC: [libp2p/specs#217](https://github.com/libp2p/specs/pull/217).

## Example

Create a new Peer Record

```TypeScript
import { PeerRecord } from '@libp2p/peer-record'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { multiaddr } from '@multiformats/multiaddr'

const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

const record = new PeerRecord({
  peerId: peerId,
  multiaddrs: [
    multiaddr('/ip4/...'),
    multiaddr('/ip4/...')
  ]
})
```

## Example

Create a Peer Record from a protobuf

```TypeScript
import { PeerRecord } from '@libp2p/peer-record'

const data = Uint8Array.from([0, 1, 2, 3, 4])
const record = PeerRecord.createFromProtobuf(data)
```

## Libp2p Flows

### Self Record

Once a libp2p node has started and is listening on a set of multiaddrs, its own peer record can be created.

The identify service is responsible for creating the self record when the identify protocol kicks in for the first time. This record will be stored for future needs of the identify protocol when connecting with other peers.

### Self record Updates

While creating peer records is fairly trivial, addresses are not static and might be modified at arbitrary times. This can happen via an Address Manager API, or even through AutoRelay/AutoNAT.

When a libp2p node changes its listen addresses, the identify service will be informed. Once that happens, the identify service creates a new self record and stores it. With the new record, the identify push/delta protocol will be used to communicate this change to the connected peers.

### Subsystem receiving a record

Considering that a node can discover other peers' addresses from a variety of sources, Libp2p PeerStore can differentiate the addresses that were obtained through a signed peer record.

Once a record is received and its signature properly validated, its envelope is stored in the AddressBook in its byte representation. The `seqNumber` remains unmarshaled so that we can quickly compare it against incoming records to determine the most recent record.

The AddressBook Addresses will be updated with the content of the envelope with a certified property. This allows other subsystems to identify the known certified addresses of a peer.

### Subsystem providing a record

Libp2p subsystems that exchange other peers information will provide the envelope that they received by those peers. As a result, other peers can verify if the envelope was really created by the addressed peer.

When a subsystem wants to provide a record, it will get it from the AddressBook, if it exists. Other subsystems are also able to provide the self record, since it is also stored in the AddressBook.

## Future Work

- Persistence only considering certified addresses?
- Peers may not know their own addresses. It's often impossible to automatically infer one's own public address, and peers may need to rely on third party peers to inform them of their observed public addresses.
- A peer may inadvertently or maliciously sign an address that they do not control. In other words, a signature isn't a guarantee that a given address is valid.
- Some addresses may be ambiguous. For example, addresses on a private subnet are valid within that subnet but are useless on the public internet.
- Once all these pieces are in place, we will also need a way to prioritize addresses based on their authenticity, that is, the dialer can prioritize self-certified addresses over addresses from an unknown origin.
- Modular dialer? (taken from go PR notes)
  - With the modular dialer, users should easily be able to configure precedence. With dialer v1, anything we do to prioritize dials is gonna be spaghetti and adhoc. With the modular dialer, you’d be able to specify the order of dials when instantiating the pipeline.
  - Multiple parallel dials. We already have the issue where new addresses aren't added to existing dials.

# Install

```console
$ npm i @libp2p/peer-record
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pPeerRecord` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/peer-record/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_peer_record.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-record/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-record/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
