# @libp2p/circuit-relay-v2

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of Circuit Relay v2

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

The `circuitRelayTransport` allows libp2p to dial and listen on [Circuit Relay](https://docs.libp2p.io/concepts/nat/circuit-relay/)
addresses.

## Example - Use as a transport

Configuring a transport will let you dial other circuit relay addresses.

```typescript
import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'

const node = await createLibp2p({
  transports: [
    circuitRelayTransport()
  ]
})
```

The `circuitRelayServer` function allows libp2p to function as a [Circuit Relay](https://docs.libp2p.io/concepts/nat/circuit-relay/)
server.  This will not work in browsers.

## Example - Use as a server

Configuring a server will let you function as a network relay for other
nodes.

```typescript
import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'

const node = await createLibp2p({
  services: {
    circuitRelay: circuitRelayServer()
  }
})
```

# Install

```console
$ npm i @libp2p/circuit-relay-v2
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pCircuitRelayV2` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/circuit-relay-v2/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_circuit_relay_v2.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/transport-circuit-relay-v2/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/transport-circuit-relay-v2/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
