# @libp2p/dcutr

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of the DCUtR Protocol

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

Direct Connection Upgrade through Relay (DCUtR) is a protocol that allows two
nodes to connect to each other who would otherwise be prevented doing so due
to being behind NATed connections or firewalls.

The protocol involves making a relayed connection between the two peers and
using the relay to synchronize connection timings so that they dial each other
at precisely the same moment.

## Example

```TypeScript
import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { tcp } from '@libp2p/tcp'
import { identify } from '@libp2p/identify'
import { dcutr } from '@libp2p/dcutr'
import { multiaddr } from '@multiformats/multiaddr'

const node = await createLibp2p({
  transports: [
    circuitRelayTransport(),
    tcp()
  ],
  services: {
    identify: identify(),
    dcutr: dcutr()
  }
})

// QmTarget is a peer that is behind a NAT, supports TCP and has a relay
// reservation
const ma = multiaddr('/ip4/.../p2p/QmRelay/p2p-circuit/p2p/QmTarget')
await node.dial(ma)

// after a while the connection should automatically get upgraded to a
// direct connection (e.g. non-limited)
while (true) {
  const connections = node.getConnections()

  if (connections.find(conn => conn.limits == null)) {
    console.info('have direct connection')
    break
  } else {
    console.info('have relayed connection')

    // wait a few seconds to see if it's succeeded yet
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5000)
    })
  }
}
```

# Install

```console
$ npm i @libp2p/dcutr
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pDcutr` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/dcutr/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_dcutr.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-dcutr/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-dcutr/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
