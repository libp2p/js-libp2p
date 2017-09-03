# js-libp2p-identify

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-identify/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-identify?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-identify.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-identify)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-identify.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-identify)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-identify.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-identify)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> libp2p Identify Protocol

## Description

Identify is a STUN protocol, used by libp2p-swarmin order to broadcast and learn about the `ip:port` pairs a specific peer is available through and to know when a new stream muxer is established, so a conn can be reused.

## How does it work

Best way to understand the current design is through this issue: https://github.com/libp2p/js-libp2p-swarm/issues/78

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/pull-stream/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.
