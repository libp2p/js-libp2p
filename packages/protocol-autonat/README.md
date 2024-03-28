# @libp2p/autonat

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of Autonat Protocol

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

The AutoNAT service uses the [AutoNAT protocol](https://docs.libp2p.io/concepts/nat/autonat/).
The service confirms addresses are dialable by remote peers, and updates the list it advertises.

The service dials randomly selected peers with a request to verify it's external addresses.
The request includes a list of public multiaddrs (addressManager.getObservedAddrs()).
The remote peers dial that list and respond with the results.

The AutoNAT service uses those responses to either:

- addressManager.confirmObservedAddr(addr)
- addressManager.removeObservedAddr(addr)

The result list of candidates and confirmed addresses can be found
at addressManager.getObservedAddrs()

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { autoNAT } from '@libp2p/autonat'

const node = await createLibp2p({
  // ...other options
  services: {
    autoNAT: autoNAT()
  }
})
```

# Install

```console
$ npm i @libp2p/autonat
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pAutonat` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/autonat/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_autonat.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
