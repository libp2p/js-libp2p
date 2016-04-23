js-libp2p-tcp
===============

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/diasdavid/js-libp2p-tcp.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-libp2p-tcp)
![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-tcp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

![](https://raw.githubusercontent.com/diasdavid/abstract-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/diasdavid/abstract-transport/master/img/badge.png)

> Node.js implementation of the TCP module that libp2p uses, which implements
> the [interface-connection](https://github.com/diasdavid/interface-connection)
> interface for dial/listen.

## Description

`libp2p-tcp` in Node.js is a very thin shim that adds support for dialing to a
`multiaddr`. This small shim will enable libp2p to use other different
transports.

## Example

```js
const Tcp = require('libp2p-tcp')
const multiaddr = require('multiaddr')

const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
const mh2 = multiaddr('/ip6/::/tcp/9092')

const tcp = new Tcp()

tcp.createListener([mh1, mh2], function handler (socket) {
  console.log('connection')
  socket.end('bye')
}, function ready () {
  console.log('ready')

  const client = tcp.dial(mh1)
  client.pipe(process.stdout)
  client.on('end', () => {
    tcp.close()
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

```js
const Tcp = require('libp2p-tcp')
```

### var tcp = new Tcp()

Creates a new TCP object. This does nothing on its own, but provides access to
`dial` and `createListener`.

### tcp.createListener(multiaddrs, handler, ready)

Creates TCP servers that listen on the addresses described in the array
`multiaddrs`. Each connection will call `handler` with a connection stream.
`ready` is called once all servers are listening.

### tcp.dial(multiaddr, options={})

Connects to the multiaddress `multiaddr` using TCP, returning the socket stream.
If `options.ready` is set to a function, it is called when a connection is
established.

### tcp.close(callback)

Closes all the listening TCP servers, calling `callback` once all of them have
been shut down.

## License

MIT
