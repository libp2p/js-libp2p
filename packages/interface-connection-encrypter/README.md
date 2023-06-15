# @libp2p/interface-connection-encrypter <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Connection Encrypter interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [API](#api)
  - [Secure Inbound](#secure-inbound)
  - [Secure Outbound](#secure-outbound)
- [Crypto Errors](#crypto-errors)
  - [Error Types](#error-types)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-connection-encrypter
```

**Modules that implement the interface**

- [@chainSafe/js-libp2p-noise](https://github.com/ChainSafe/js-libp2p-noise)
- [js-libp2p-secio](https://github.com/NodeFactoryIo/js-libp2p-secio)

## API

- `Crypto`
  - `protocol<string>`: The protocol id of the crypto module.
  - `secureInbound<function(PeerId, duplex)>`: Secures inbound connections.
  - `secureOutbound<function(PeerId, duplex, PeerId)>`: Secures outbound connections.

### Secure Inbound

- `const { conn, remotePeer } = await crypto.secureInbound(localPeer, duplex, [remotePeer])`

Secures an inbound [streaming iterable duplex][iterable-duplex] connection. It returns an encrypted [streaming iterable duplex][iterable-duplex], as well as the [PeerId][peer-id] of the remote peer.

**Parameters**

- `localPeer` is the [PeerId][peer-id] of the receiving peer.
- `duplex` is the [streaming iterable duplex][iterable-duplex] that will be encryption.
- `remotePeer` is the optional [PeerId][peer-id] of the initiating peer, if known. This may only exist during transport upgrades.

**Return Value**

- `<object>`
  - `conn<duplex>`: An encrypted [streaming iterable duplex][iterable-duplex].
  - `remotePeer<PeerId>`: The [PeerId][peer-id] of the remote peer.

### Secure Outbound

- `const { conn, remotePeer } = await crypto.secureOutbound(localPeer, duplex, remotePeer)`

Secures an outbound [streaming iterable duplex][iterable-duplex] connection. It returns an encrypted [streaming iterable duplex][iterable-duplex], as well as the [PeerId][peer-id] of the remote peer.

**Parameters**

- `localPeer` is the [PeerId][peer-id] of the receiving peer.
- `duplex` is the [streaming iterable duplex][iterable-duplex] that will be encrypted.
- `remotePeer` is the [PeerId][peer-id] of the remote peer. If provided, implementations **should** use this to validate the integrity of the remote peer.

**Return Value**

- `<object>`
  - `conn<duplex>`: An encrypted [streaming iterable duplex][iterable-duplex].
  - `remotePeer<PeerId>`: The [PeerId][peer-id] of the remote peer. This **should** match the `remotePeer` parameter, and implementations should enforce this.

## Crypto Errors

Common crypto errors come with the interface, and can be imported directly. All Errors take an optional message.

```js
const {
  InvalidCryptoExchangeError,
  InvalidCryptoTransmissionError,
  UnexpectedPeerError
} = require('libp2p-interfaces/src/crypto/errors')

const error = new UnexpectedPeerError('a custom error message')
console.log(error.code === UnexpectedPeerError.code) // true
```

### Error Types

- `InvalidCryptoExchangeError` - Should be thrown when a peer provides data that is insufficient to finish the crypto exchange.
- `InvalidCryptoTransmissionError` - Should be thrown when an error occurs during encryption/decryption.
- `UnexpectedPeerError` - Should be thrown when the expected peer id does not match the peer id determined via the crypto exchange.

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_connection_encrypter.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[peer-id]: https://github.com/libp2p/js-peer-id

[iterable-duplex]: https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it
