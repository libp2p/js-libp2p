# @libp2p/utils <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-utils.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utils)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-utils/actions/workflows/js-test-and-release.yml)

> Package to aggregate shared logic and dependencies for the libp2p ecosystem

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Lead Maintainer](#lead-maintainer)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)
- [Contribute](#contribute-1)

## Install

```console
$ npm i @libp2p/utils
```

The libp2p ecosystem has lots of repos with it comes several problems like:

- Domain logic dedupe - all modules shared a lot of logic like validation, streams handling, etc.
- Dependencies management - it's really easy with so many repos for dependencies to go out of control, they become outdated, different repos use different modules to do the same thing (like merging defaults options), browser bundles ends up with multiple versions of the same package, bumping versions is cumbersome to do because we need to go through several repos, etc.

These problems are the motivation for this package, having shared logic in this package avoids creating cyclic dependencies, centralizes common use modules/functions (exactly like aegir does for the tooling), semantic versioning for 3rd party dependencies is handled in one single place (a good example is going from streams 2 to 3) and maintainers should only care about having `libp2p-utils` updated.

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos)

## Usage

Each function should be imported directly.

```js
import ipAndPortToMultiaddr from '@libp2p/utils/ip-port-to-multiaddr'

const ma = ipAndPortToMultiaddr('127.0.0.1', 9000)
```

You can check the [API docs](./API.md).

## Contribute

Contributions welcome. Please check out [the issues](https://github.com/libp2p/js-libp2p-utils/issues).

Check out our [contributing document](https://github.com/ipfs/community/blob/master/contributing.md) for more information on how we work, and about contributing in general. Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
