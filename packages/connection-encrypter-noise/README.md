# @libp2p/noise

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Noise libp2p handshake for js-libp2p

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

This repository contains TypeScript implementation of noise protocol, an encryption protocol used in libp2p.

Formerly published as [`@chainsafe/libp2p-noise`](https://www.npmjs.com/package/@chainsafe/libp2p-noise).

## Usage

Install with `npm i @libp2p/noise`.

Example of using default noise configuration and passing it to the libp2p config:

```ts
import { createLibp2p } from 'libp2p'
import { noise } from '@libp2p/noise'

const libp2p = await createLibp2p({
  connectionEncrypters: [noise()],
  // ... other options
})
```

See the [NoiseInit](https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-noise/src/noise.ts) interface for noise configuration options.

## API

This module exposes an implementation of the [ConnectionEncrypter](https://libp2p.github.io/js-libp2p/interfaces/_libp2p_interface.ConnectionEncrypter.html) interface.

## Bring your own crypto

You can provide a custom crypto implementation (instead of the default, based on [noble](https://paulmillr.com/noble/)) by adding a `crypto` field to the init argument passed to the `Noise` factory.

The implementation must conform to the `ICryptoInterface`, defined in <https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-noise/src/crypto.ts>

# Install

```console
$ npm i @libp2p/noise
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_noise.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-noise/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-noise/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
