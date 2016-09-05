js-libp2p-tcp
===============

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-tcp)
![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> Node.js implementation of the TCP module that libp2p uses, which implements
> the [interface-connection](https://github.com/libp2p/interface-connection)
> interface for dial/listen.

## Description

`libp2p-tcp` in Node.js is a very thin shim that adds support for dialing to a
`multiaddr`. This small shim will enable libp2p to use other different
transports.

## Example

```js
const TCP = require('libp2p-tcp')
const multiaddr = require('multiaddr')

const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
const mh2 = multiaddr('/ip6/::/tcp/9092')

const tcp = new TCP()

var listener = tcp.createListener(mh1, function handler (socket) {
  console.log('connection')
  socket.end('bye')
})

listener.listen(mh1, function ready () {
  console.log('ready')

  const client = tcp.dial(mh1)
  client.pipe(process.stdout)
  client.on('end', () => {
    listener.close()
  })
})
```

outputs

```
ready
connection
bye
```

## Installation

### npm

```sh
> npm i libp2p-tcp
```

## API

[![](https://raw.githubusercontent.com/diasdavid/interface-transport/master/img/badge.png)](https://github.com/diasdavid/interface-transport)

`libp2p-tcp` accepts TCP addresses both IPFS and non IPFS encapsulated addresses, i.e:

`/ip4/127.0.0.1/tcp/4001`
`/ip4/127.0.0.1/tcp/4001/ipfs/QmHash`

Both for dialing and listening.

## License

MIT
