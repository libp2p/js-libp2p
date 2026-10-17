# @ipshipyard/keychain

[![codecov](https://img.shields.io/codecov/c/github/ipshipyard/js-keychain.svg?style=flat-square)](https://codecov.io/gh/ipshipyard/js-keychain)
[![CI](https://img.shields.io/github/actions/workflow/status/ipshipyard/js-keychain/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/ipshipyard/js-keychain/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Generate and securely store private keys at rest

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

A WebCrypto-first keychain implementation for use with Helia and libp2p.

## Configuring additional implementations

ECDSA, Ed25519 and RSA keys are supported out of the box but other schemes
are configurable by passing a `CryptoLoader` that can return `Crypto`
instances.

# Install

```console
$ npm i @ipshipyard/keychain
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `IpshipyardKeychain` in the global namespace.

```html
<script src="https://unpkg.com/@ipshipyard/keychain/dist/index.min.js"></script>
```

# API Docs

- <https://ipshipyard.github.io/js-keychain>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/ipshipyard/js-keychain/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/ipshipyard/js-keychain/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
