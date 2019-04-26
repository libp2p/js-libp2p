# js-libp2p-tcp

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp)
[![](https://img.shields.io/travis/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-tcp)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)


> JavaScript implementation of the TCP module for libp2p. It exposes the [interface-transport](https://github.com/libp2p/interface-connection) for dial/listen. `libp2p-tcp` is a very thin shim that adds support for dialing to a `multiaddr`. This small shim will enable libp2p to use other different transports.

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Table of Contents

- [Install](#install)
  - [npm](#npm)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

### npm

```sh
> npm install libp2p-tcp
```

## Usage

```js
const TCP = require('libp2p-tcp')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')

const tcp = new TCP()

const listener = tcp.createListener((socket) => {
  console.log('new connection opened')
  pull(
    pull.values(['hello']),
    socket
  )
})

listener.listen(mh, () => {
  console.log('listening')

  pull(
    tcp.dial(mh),
    pull.collect((err, values) => {
      if (!err) {
        console.log(`Value: ${values.toString()}`)
      } else {
        console.log(`Error: ${err}`)
      }

      // Close connection after reading
      listener.close()
    }),
  )
})
```

Outputs:

```sh
listening
new connection opened
Value: hello
```

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

`libp2p-tcp` accepts TCP addresses both IPFS and non IPFS encapsulated addresses, i.e:

`/ip4/127.0.0.1/tcp/4001`
`/ip4/127.0.0.1/tcp/4001/ipfs/QmHash`

Both for dialing and listening.

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Contribute

Contributions are welcome! The libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

- [Check out the existing issues](//github.com/libp2p/js-libp2p-tcp/issues).
- **Perform code reviews**.
- **Add tests**. There can never be enough tests.

Please be aware that all interactions related to libp2p are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT](LICENSE) © 2015-2016 David Dias
