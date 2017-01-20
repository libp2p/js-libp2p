js-libp2p-multiplex
===================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-multiplex.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-multiplex)
![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-multiplex.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-multiplex)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> multiplex implementation wrapper that is compatible with libp2p Stream Muxer expected interface

[![](https://github.com/libp2p/interface-stream-muxer/raw/master/img/badge.png)](https://github.com/libp2p/interface-stream-muxer)

## Usage

Let's define a `listener.js`, which starts a TCP server on port 9999
and waits for a connection. Once we get a connection, we wait for
a stream. And finally, once we have the stream, we pull the data
from that stream, and printing it to the console.

```JavaScript
const multiplex = require('libp2p-multiplex')
const tcp = require('net')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')

const listener = tcp.createServer((socket) => {
  console.log('[listener] Got connection!')

  const muxer = multiplex.listener(toPull(socket))

  muxer.on('stream', (stream) => {
    console.log('[listener] Got stream!')
    pull(
      stream,
      pull.drain((data) => {
        console.log('[listener] Received:')
        console.log(data.toString())
      })
    )
  })
})

listener.listen(9999, () => {
  console.log('[listener] listening on 9999')
})
```

Now, let's define `dialer.js` who will connect to our `listener` over a TCP socket. Once we have that, we'll put a message in the stream for our `listener`.

```JavaScript
const multiplex = require('libp2p-multiplex')
const tcp = require('net')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')

const socket = tcp.connect(9999)

const muxer = multiplex.dialer(toPull(socket))

console.log('[dialer] opening stream')
const stream = muxer.newStream((err) => {
  console.log('[dialer] opened stream')
  if (err) throw err
})

pull(
  pull.values(['hey, how is it going. I am the dialer']),
  stream
)
```

Now we can first run `listener.js` and then `dialer.js` to see the
following output:

*listener.js*

```
$ node listener.js
[listener] listening on 9999
[listener] Got connection!
[listener] Got stream!
[listener] Received:
hey, how is it going. I am the dialer
```

*dialer.js*

```
$ node dialer.js
[dialer] opening stream
[dialer] opened stream
```

## API

```js
const multiplex = require('libp2p-multiplex')
```

#### var multi = multiplex(transport, isListener)

Returns a new multiplexert that multiplexes over the duplex stream `transport`.
`isListener` should be true when this multiplexer will be used to listen for
streams.

#### multiplex.newStream(function (err, stream) {})

Creates a new stream over the original `transport`. The resultant stream is
provided asynchronously via the callback.

#### multiplex.on('stream', function (stream) {})

Emits an event when a new stream is received by the other side of the transport.

#### multiplex.close()

Closes the stream (from either side).

#### multiplex.on('close')

Emitted when the stream has been closed.

#### multiplex.on('error')

Emitted when the stream produces an error.

## Install

```sh
> npm install libp2p-multiplex
```
