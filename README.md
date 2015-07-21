ipfs-swarm Node.js implementation
=================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> IPFS swarm implementation in Node.js

# Description

ipfs-swarm is an abstraction for the network layer on IPFS. It offers an API to open streams between peers on a specific protocol.

Ref spec (still a WiP) - https://github.com/diasdavid/specs/blob/protocol-spec/protocol/layers.md#network-layer

# Usage

### Create a new Swarm

```javascript
var Swarm = require('ipfs-swarm')

var s = new Swarm([port]) // `port` defalts to 4001
```

### Set the swarm to listen for incoming streams

```javascript
s.listen([port], [callback]) // `port` defaults to 4001, `callback` gets called when the socket starts listening
```

### Close the listener/socket and every open stream that was multiplexed on it

```javascript
s.closeListener()
```

### Register a protocol to be handled by an incoming stream

```javascript
s.registerHandler('/name/protocol/you/want/version', function (stream) {})
```

### Dial a new stream

```
s.openStream(peerInfo, protocol, function (err, stream) {})
```

peerInfo must be a [`ipfs-peer`](https://www.npmjs.com/package/ipfs-peer) object, contaning both peer-id and multiaddrs.

## Events emitted

```
.on('error')

.on('connection')
.on('connection-unknown') // used by Identify to start the Identify protocol from listener to dialer
```

## Identify protocol

The Identify protocol is an integral part to Swarm. It enables peers to share observedAddrs, identities and other possible address available. This enables us to do better NAT traversal.

To instantiate Identify:

```
var Identify = require('ipfs-swarm/identify')

var i = new Identify(swarmInstance, peerSelf)
```

`swarmInstance` must be an Instance of swarm and `peerSelf` must be a instance of `ipfs-peer` that represents the peer that instantiated this Identify

Identify emits a `peer-update` event each time it receives information from another peer.
