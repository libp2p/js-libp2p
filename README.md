js-libp2p-multiplex
===================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/diasdavid/js-libp2p-multiplex.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-libp2p-multiplex)
![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-multiplex.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-multiplex)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> multiplex implementation wrapper that is compatible with libp2p Stream Muxer expected interface

[![](https://github.com/diasdavid/interface-stream-muxer/raw/master/img/badge.png)](https://github.com/diasdavid/interface-stream-muxer)

# Usage

## Install

```sh
> npm i libp2p-multiplex
```

## In tour code

```JavaScript
const multiplex = require('libp2p-multiplex')
```

## API

#### Attaching it to a socket (duplex stream)

**As a listener**

```JavaScript
const listener = multiplex(socket, true)
```

**As a dialer**

```JavaScript
const dialer = multiplex(socket, false)
```

#### Opening a multiplex duplex stream

```JavaScript
const conn = dialer.newStream((err, conn) => {})

conn.on('error', (err) => {})
```

note: Works the same on the listener side

#### Receiving incoming stream

```JavaScript
dialer.on('stream', (conn) => {})
```

note: Works the same on the listener side

#### Close

```JavaScript
dialer.close()
```

note: Works the same on the listener side

#### Other events

```JavaScript
dialer.on('close', () => {})
dialer.on('error', () => {})
```

note: Works the same on the listener side
