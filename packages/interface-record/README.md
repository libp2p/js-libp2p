# @libp2p/interface-record <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Record interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [Create Record](#create-record)
- [API](#api)
  - [marshal](#marshal)
  - [equals](#equals)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-record
```

A libp2p node needs to store data in a public location (e.g. a DHT), or rely on potentially untrustworthy intermediaries to relay information. Libp2p provides an all-purpose data container called **envelope**, which includes a signature of the data, so that it its authenticity can be verified.

The record represents the data that will be stored inside the **envelope** when distributing records across the network. The `interface-record` aims to guarantee that any type of record created is compliant with the libp2p **envelope**.

Taking into account that a record might be used in different contexts, an **envelope** signature made for a specific purpose **must not** be considered valid for a different purpose. Accordingly, each record has a short and descriptive string representing the record use case, known as **domain**. The data to be signed will be prepended with the domain string, in order to create a domain signature.

A record can also contain a Uint8Array codec (ideally registered as a [multicodec](https://github.com/multiformats/multicodec)). This codec will prefix the record data in the **envelope** , so that it can be deserialized deterministically.

## Usage

```js
const tests = require('libp2p-interfaces-compliance-tests/record')
describe('your record', () => {
  tests({
    async setup () {
      return YourRecord
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})
```

## Create Record

```js
const multicodec = require('multicodec')
const Record = require('libp2p-interfaces/src/record')
const { fromString } = require('uint8arrays/from-string')
// const Protobuf = require('./record.proto')

const ENVELOPE_DOMAIN_PEER_RECORD = 'libp2p-peer-record'
const ENVELOPE_PAYLOAD_TYPE_PEER_RECORD = fromString('0301', 'hex')

/**
 * @implements {import('libp2p-interfaces/src/record/types').Record}
 */
class PeerRecord {
  constructor (peerId, multiaddrs, seqNumber) {
    this.domain = ENVELOPE_DOMAIN_PEER_RECORD
    this.codec = ENVELOPE_PAYLOAD_TYPE_PEER_RECORD
  }

  /**
   * Marshal a record to be used in an envelope.
   *
   * @returns {Uint8Array}
   */
  marshal () {
    // Implement and return using Protobuf
  }

  /**
   * Returns true if `this` record equals the `other`.
   *
   * @param {PeerRecord} other
   * @returns {other is Record}
   */
  equals (other) {
    // Verify
  }
}
```

## API

### marshal

- `record.marshal()`

Marshal a record to be used in a libp2p envelope.

**Returns**

It returns a `Protobuf` containing the record data.

### equals

- `record.equals(other)`

Verifies if the other Record is identical to this one.

**Parameters**

- other is a `Record` to compare with the current instance.

**Returns**

- `other is Record`

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_record.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
