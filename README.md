# @libp2p/utils <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-utils.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utils)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-utils/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-utils/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Package to aggregate shared logic and dependencies for the libp2p ecosystem

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/utils
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pUtils` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/utils/dist/index.min.js"></script>
```

The libp2p ecosystem has lots of repos with it comes several problems like:

- Domain logic dedupe - all modules shared a lot of logic like validation, streams handling, etc.
- Dependencies management - it's really easy with so many repos for dependencies to go out of control, they become outdated, different repos use different modules to do the same thing (like merging defaults options), browser bundles ends up with multiple versions of the same package, bumping versions is cumbersome to do because we need to go through several repos, etc.

These problems are the motivation for this package, having shared logic in this package avoids creating cyclic dependencies, centralizes common use modules/functions (exactly like aegir does for the tooling), semantic versioning for 3rd party dependencies is handled in one single place (a good example is going from streams 2 to 3) and maintainers should only care about having `libp2p-utils` updated.

## Usage

Each function should be imported directly.

```js
import ipAndPortToMultiaddr from '@libp2p/utils/ip-port-to-multiaddr'

const ma = ipAndPortToMultiaddr('127.0.0.1', 9000)
```

You can check the [API docs](https://libp2p.github.io/js-libp2p-utils).

## API Docs

- <https://libp2p.github.io/js-libp2p-utils>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
