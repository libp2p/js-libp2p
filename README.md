# js-libp2p-tcp

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-tcp)
![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> Node.js implementation of the TCP module that libp2p uses, which implements the [interface-connection](https://github.com/libp2p/interface-connection) interface for dial/listen.

## Description

`libp2p-tcp` in Node.js is a very thin shim that adds support for dialing to a `multiaddr`. This small shim will enable libp2p to use other different transports.

**Note:** This module uses [pull-streams](https://pull-stream.github.io) for all stream based interfaces.

## Example

```js
const TCP = require('libp2p-tcp')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const mh1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
const mh2 = multiaddr('/ip6/::/tcp/9092')

const tcp = new TCP()

const listener = tcp.createListener(mh1, (socket) => {
  console.log('new connection opened')
  pull(
    pull.values(['hello']),
    socket
  )
})

listener.listen(() => {
  console.log('listening')

  pull(
    tcp.dial(mh1),
    pull.log,
    pull.onEnd(() => {
      tcp.close()
    })
  )
})
```

outputs

```
listening
new connection opened
hello
```

## Installation

### npm

```sh
> npm i libp2p-tcp
```

## This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about what took us to make this migration, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to Node.js Stream using the module `pull-stream-to-stream`, giving you an instance of a Node.js stream that is linked to the pull-stream. Example:

```
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about his utility, visit https://pull-stream.github.io/#pull-stream-to-stream

## API

[![](https://raw.githubusercontent.com/diasdavid/interface-transport/master/img/badge.png)](https://github.com/diasdavid/interface-transport)

`libp2p-tcp` accepts TCP addresses both IPFS and non IPFS encapsulated addresses, i.e:

`/ip4/127.0.0.1/tcp/4001`
`/ip4/127.0.0.1/tcp/4001/ipfs/QmHash`

Both for dialing and listening.

## License

MIT
