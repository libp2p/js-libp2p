# @libp2p/websockets

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> JavaScript implementation of the WebSockets module that libp2p uses and that implements the interface-transport spec

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

A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).

## Example

```TypeScript
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'

const node = await createLibp2p({
  transports: [
    webSockets()
  ]
//... other config
})
await node.start()

const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
await node.dial(ma)
```

## Filters

When run in a browser by default this module will only connect to secure web socket addresses.

To change this you should pass a filter to the factory function.

You can create your own address filters for this transports, or rely in the filters [provided](./src/filters.js).

The available filters are:

- `filters.all`
  - Returns all TCP and DNS based addresses, both with `ws` or `wss`.
- `filters.dnsWss`
  - Returns all DNS based addresses with `wss`.
- `filters.dnsWsOrWss`
  - Returns all DNS based addresses, both with `ws` or `wss`.

## Example - Allow dialing insecure WebSockets

```TypeScript
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import filters from '@libp2p/websockets/filters'

const node = await createLibp2p({
  transports: [
    webSockets({
      // connect to all sockets, even insecure ones
      filter: filters.all
    })
  ]
})
```

# Install

```console
$ npm i @libp2p/websockets
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pWebsockets` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/websockets/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_websockets.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
