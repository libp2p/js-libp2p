# @libp2p/webrtc <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-webrtc.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-webrtc/test%20&%20maybe%20release/main?style=flat-square)](https://github.com/libp2p/js-libp2p-webrtc/actions/workflows/js-test-and-release.yml)

> A libp2p transport using WebRTC connections

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [Examples](#examples)
- [Interfaces](#interfaces)
  - [Transport](#transport)
  - [Connection](#connection)
- [Development](#development)
  - [Build](#build)
  - [Protocol Buffers](#protocol-buffers)
  - [Test](#test)
  - [Lint](#lint)
  - [Clean](#clean)
  - [Check Dependencies](#check-dependencies)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/webrtc
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pWebrtc` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/webrtc/dist/index.min.js"></script>
```

## Usage

```js
import { createLibp2p } from 'libp2p'
import { Noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import first from "it-first";
import { pipe } from "it-pipe";
import { fromString, toString } from "uint8arrays";
import { webRTC } from '@libp2p/webrtc'

const node = await createLibp2p({
  transports: [webRTC()],
  connectionEncryption: [() => new Noise()],
});

await node.start()

const ma =  multiaddr('/ip4/0.0.0.0/udp/56093/webrtc/certhash/uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ')
const stream = await node.dialProtocol(ma, ['/my-protocol/1.0.0'])
const message = `Hello js-libp2p-webrtc\n`
const response = await pipe([fromString(message)], stream, async (source) => await first(source))
const responseDecoded = toString(response.slice(0, response.length))
```

## Examples

Examples can be found in the [examples folder](examples/README.md).

## Interfaces

### Transport

![https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interface-transport](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/packages/interface-transport/img/badge.png)

Browsers can usually only `dial`, but `listen` is supported in the WebRTC
transport when paired with another listener like CircuitV2, where you listen on
a relayed connection. Take a look at [index.js](examples/browser-to-browser/index.js) for
an example.

### Connection

![https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interface-connection](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/packages/interface-connection/img/badge.png)

```js
interface MultiaddrConnection extends Duplex<Uint8Array> {
  close: (err?: Error) => Promise<void>
  remoteAddr: Multiaddr
  timeline: MultiaddrConnectionTimeline
}

class WebRTCMultiaddrConnection implements MultiaddrConnection { }
```

## Development

Contributions are welcome! The libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

- [Check out the existing issues](//github.com/little-bear-labs/js-libp2p-webrtc/issues).
- **Perform code reviews**.
- **Add tests**. There can never be enough tests.
- Go through the modules and **check out existing issues**. This is especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.

Please be aware that all interactions related to libp2p are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

This module leans heavily on (Aegir)\[<https://github.com/ipfs/aegir>] for most of the `package.json` scripts.

### Build

The build script is a wrapper to `aegir build`.  To build this package:

```shell
npm run build
```

The build will be located in the `/dist` folder.

### Protocol Buffers

There is also `npm run generate:proto` script that uses protoc to populate the generated code directory `proto_ts` based on `*.proto` files in src. Don't forget to run this step before `build` any time you make a change to any of the `*.proto` files.

### Test

To run all tests:

```shell
npm test
```

To run tests for Chrome only:

```shell
npm run test:chrome
```

To run tests for Firefox only:

```shell
npm run test:firefox
```

### Lint

Aegir is also used to lint the code, which follows the [Standard](https://github.com/standard/standard) JS linter.
The VS Code plugin for this standard is located at <https://marketplace.visualstudio.com/items?itemName=standard.vscode-standard>.
To lint this repo:

```shell
npm run lint
```

You can also auto-fix when applicable:

```shell
npm run lint:fix
```

### Clean

```shell
npm run clean
```

### Check Dependencies

```shell
npm run deps-check
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
