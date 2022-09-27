# @libp2p/webtransport <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)

> JavaScript implementation of the WebTransport module that libp2p uses and that implements the interface-transport spec

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Description](#description)
- [Usage](#usage)
- [Libp2p Usage Example](#libp2p-usage-example)
- [API](#api)
  - [Transport](#transport)
  - [Connection](#connection)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/webtransport
```

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Description

`libp2p-webtransport` is the WebTransport transport implementation compatible with libp2p.

## Usage

```sh
> npm i @libp2p/webtransport
```

## Libp2p Usage Example

```js
import Libp2p from 'libp2p'
import { WebTransport } from '@libp2p/webtransport'
import { MPLEX } from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'

const node = await Libp2p.create({
  modules: {
    connEncryption: [NOISE]
      transports: [new WebTransport()],
      connectionEncryption: [new Noise()]
  },
})
```

For more information see [libp2p/js-libp2p/doc/CONFIGURATION.md#customizing-transports](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-transports).

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
