# @libp2p/pcp-nat

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> PCP NAT hole punching

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

The service exported by this module attempts to configure NAT hole punching
via PCP (Port Control Protocol).

This will make your node publicly accessible from the internet.

For this to work there are some prerequisites:

1. Your router must have PCP support enabled
2. Your libp2p node must be listening on a non-loopback IPv4 or IPv6 address
3. You must not be [double-NATed](https://kb.netgear.com/30186/What-is-double-NAT-and-why-is-it-bad) by your ISP

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { PCPNAT } from '@libp2p/pcp-nat'

const node = await createLibp2p({
  addresses: {
    listen: [
      '/ip6/2001:db8:85a3:8d3:aaaa:aaaa:aaaa:aaaa/tcp/0'
    ]
  },
  transports: [
    tcp()
  ],
  services: {
      pcpNat: pcpNAT("2001:db8:85a3:8d3:1319:8a2e:370:7348") // IPv6 Global Unicast Address (GUA) LAN address of your router
  }
})
```

# Install

```console
$ npm i @libp2p/pcp-nat
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_pcp_nat.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/pcp-nat/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/pcp-nat/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
