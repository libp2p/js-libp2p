# js-libp2p-websockets

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-websockets/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-websockets?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-websockets.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-websockets)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-websockets.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-websockets)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

> JavaScript implementation of the WebSockets module that libp2p uses and that implements the interface-transport interface

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Description

`libp2p-websockets` is the WebSockets implementation compatible with libp2p.

## Usage

## Install

### npm

```sh
> npm i libp2p-websockets
```

### Example

```js
const WS = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const mh = multiaddr('/ip4/0.0.0.0/tcp/9090/ws')

const ws = new WS()

const listener = ws.createListener((socket) => {
  console.log('new connection opened')
  pull(
    pull.values(['hello']),
    socket
  )
})

listener.listen(mh, () => {
  console.log('listening')

  pull(
    ws.dial(mh),
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

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)
