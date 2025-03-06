# @libp2p/upnp-nat

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> UPnP NAT hole punching

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
via UPnP.

This will make your node publicly accessible from the internet.

For this to work there are some prerequisites:

1. Your router must have UPnP support enabled
2. Your libp2p node must be listening on a non-loopback IPv4 address
3. You must not be [double-NATed](https://kb.netgear.com/30186/What-is-double-NAT-and-why-is-it-bad) by your ISP

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { uPnPNAT } from '@libp2p/upnp-nat'

const node = await createLibp2p({
  addresses: {
    listen: [
      '/ip4/0.0.0.0/tcp/0'
    ]
  },
  transports: [
    tcp()
  ],
  services: {
    upnpNAT: uPnPNAT()
  }
})
```

## Example - Manually specifying gateways and external ports

Some ISP-provided routers are under powered and may require rebooting before
they will respond to SSDP M-SEARCH messages.

You can manually specify your external address and/or gateways, though note
that those gateways will still need to have UPnP enabled in order for libp2p
to configure mapping of external ports (for IPv4) and/or opening pinholes in
the firewall (for IPv6).

```typescript
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { uPnPNAT } from '@libp2p/upnp-nat'

const node = await createLibp2p({
  addresses: {
    listen: [
      '/ip4/0.0.0.0/tcp/0'
    ]
  },
  transports: [
    tcp()
  ],
  services: {
    upnpNAT: uPnPNAT({
      // manually specify external address - this will normally be an IPv4
      // address that the router is performing NAT with
      externalAddress: '92.137.164.96',
      gateways: [
        // an IPv4 gateway
        'http://192.168.1.1:8080/path/to/descriptor.xml',
        // an IPv6 gateway
        'http://[xx:xx:xx:xx]:8080/path/to/descriptor.xml'
      ]
    })
  }
})
```

# Install

```console
$ npm i @libp2p/upnp-nat
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_upnp_nat.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/upnp-nat/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/upnp-nat/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
