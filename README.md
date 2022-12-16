# @libp2p/peer-record <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-peer-record.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-record)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-peer-record/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-peer-record/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Used to transfer signed peer data across the network

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Description](#description)
  - [Envelope](#envelope)
- [Usage](#usage)
- [Peer Record](#peer-record)
  - [Usage](#usage-1)
  - [Libp2p Flows](#libp2p-flows)
    - [Self Record](#self-record)
    - [Self record Updates](#self-record-updates)
    - [Subsystem receiving a record](#subsystem-receiving-a-record)
    - [Subsystem providing a record](#subsystem-providing-a-record)
  - [Future Work](#future-work)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/peer-record
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPeerRecord` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/peer-record/dist/index.min.js"></script>
```

## Description

Libp2p nodes need to store data in a public location (e.g. a DHT), or rely on potentially untrustworthy intermediaries to relay information over its lifetime. Accordingly, libp2p nodes need to be able to verify that the data came from a specific peer and that it hasn't been tampered with.

### Envelope

Libp2p provides an all-purpose data container called **envelope**. It was created to enable the distribution of verifiable records, which we can prove originated from the addressed peer itself. The envelope includes a signature of the data, so that its authenticity is verified.

This envelope stores a marshaled record implementing the [interface-record](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/record). These Records are designed to be serialized to bytes and placed inside of the envelopes before being shared with other peers.

You can read further about the envelope in [libp2p/specs#217](https://github.com/libp2p/specs/pull/217).

## Usage

- create an envelope with an instance of an [interface-record](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/record) implementation and prepare it for being exchanged:

```js
// interface-record implementation example with the "libp2p-example" namespace
import { PeerRecord } from '@libp2p/peer-record'
import { fromString } from 'uint8arrays/from-string'

class ExampleRecord extends PeerRecord {
  constructor () {
    super ('libp2p-example', fromString('0302', 'hex'))
  }

  marshal () {}

  equals (other) {}
}

ExampleRecord.createFromProtobuf = () => {}
```

```js
import { PeerEnvelope } from '@libp2p/peer-record'
import { ExampleRecord } from './example-record.js'

const rec = new ExampleRecord()
const e = await PeerEnvelope.seal(rec, peerId)
const wireData = e.marshal()
```

- consume a received envelope (`wireData`) and transform it back to a record:

```js
import { PeerEnvelope } from '@libp2p/peer-record'
import { ExampleRecord } from './example-record.js'

const domain = 'libp2p-example'
let e

try {
  e = await PeerEnvelope.openAndCertify(wireData, domain)
} catch (err) {}

const rec = ExampleRecord.createFromProtobuf(e.payload)
```

## Peer Record

All libp2p nodes keep a `PeerStore`, that among other information stores a set of known addresses for each peer, which can come from a variety of sources.

Libp2p peer records were created to enable the distribution of verifiable address records, which we can prove originated from the addressed peer itself. With such guarantees, libp2p is able to prioritize addresses based on their authenticity, with the most strict strategy being to only dial certified addresses (no strategies have been implemented at the time of writing).

A peer record contains the peers' publicly reachable listen addresses, and may be extended in the future to contain additional metadata relevant to routing. It also contains a `seqNumber` field, a timestamp per the spec, so that we can verify the most recent record.

You can read further about the Peer Record in [libp2p/specs#217](https://github.com/libp2p/specs/pull/217).

### Usage

- create a new Peer Record

```js
import { PeerRecord } from '@libp2p/peer-record'

const pr = new PeerRecord({
  peerId: node.peerId,
  multiaddrs: node.multiaddrs
})
```

- create a Peer Record from a protobuf

```js
import { PeerRecord } from '@libp2p/peer-record'

const pr = PeerRecord.createFromProtobuf(data)
```

### Libp2p Flows

#### Self Record

Once a libp2p node has started and is listening on a set of multiaddrs, its own peer record can be created.

The identify service is responsible for creating the self record when the identify protocol kicks in for the first time. This record will be stored for future needs of the identify protocol when connecting with other peers.

#### Self record Updates

***NOT\_YET\_IMPLEMENTED***

While creating peer records is fairly trivial, addresses are not static and might be modified at arbitrary times. This can happen via an Address Manager API, or even through AutoRelay/AutoNAT.

When a libp2p node changes its listen addresses, the identify service will be informed. Once that happens, the identify service creates a new self record and stores it. With the new record, the identify push/delta protocol will be used to communicate this change to the connected peers.

#### Subsystem receiving a record

Considering that a node can discover other peers' addresses from a variety of sources, Libp2p Peerstore can differentiate the addresses that were obtained through a signed peer record.

Once a record is received and its signature properly validated, its envelope is stored in the AddressBook in its byte representation. The `seqNumber` remains unmarshalled so that we can quickly compare it against incoming records to determine the most recent record.

The AddressBook Addresses will be updated with the content of the envelope with a certified property. This allows other subsystems to identify the known certified addresses of a peer.

#### Subsystem providing a record

Libp2p subsystems that exchange other peers information will provide the envelope that they received by those peers. As a result, other peers can verify if the envelope was really created by the addressed peer.

When a subsystem wants to provide a record, it will get it from the AddressBook, if it exists. Other subsystems are also able to provide the self record, since it is also stored in the AddressBook.

### Future Work

- Persistence only considering certified addresses?
- Peers may not know their own addresses. It's often impossible to automatically infer one's own public address, and peers may need to rely on third party peers to inform them of their observed public addresses.
- A peer may inadvertently or maliciously sign an address that they do not control. In other words, a signature isn't a guarantee that a given address is valid.
- Some addresses may be ambiguous. For example, addresses on a private subnet are valid within that subnet but are useless on the public internet.
- Once all these pieces are in place, we will also need a way to prioritize addresses based on their authenticity, that is, the dialer can prioritize self-certified addresses over addresses from an unknown origin.
  - Modular dialer? (taken from go PR notes)
    - With the modular dialer, users should easily be able to configure precedence. With dialer v1, anything we do to prioritise dials is gonna be spaghetti and adhoc. With the modular dialer, you’d be able to specify the order of dials when instantiating the pipeline.
    - Multiple parallel dials. We already have the issue where new addresses aren't added to existing dials.

## API Docs

- <https://libp2p.github.io/js-libp2p-peer-record>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
