# @libp2p/utils

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Package to aggregate shared logic and dependencies for the libp2p ecosystem

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

The libp2p ecosystem has lots of repos with it comes several problems like:

- Domain logic dedupe - all modules shared a lot of logic like validation, streams handling, etc.
- Dependencies management - it's really easy with so many repos for dependencies to go out of control, they become outdated, different repos use different modules to do the same thing (like merging defaults options), browser bundles ends up with multiple versions of the same package, bumping versions is cumbersome to do because we need to go through several repos, etc.

These problems are the motivation for this package, having shared logic in this package avoids creating cyclic dependencies, centralizes common use modules/functions (exactly like aegir does for the tooling), semantic versioning for 3rd party dependencies is handled in one single place (a good example is going from streams 2 to 3) and maintainers should only care about having `libp2p-utils` updated.

## Example

Each function should be imported directly.

```TypeScript
import { ipPortToMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'

const ma = ipPortToMultiaddr('127.0.0.1', 9000)
```

# Install

```console
$ npm i @libp2p/utils
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pUtils` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/utils/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_utils.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/utils/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/utils/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
