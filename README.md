ipfs-swarm Node.js implementation
=================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> IPFS swarm implementation in Node.js

# Description

ipfs-swarm is an abstraction for the network layer on IPFS. It offers an API to open streams between peers on a specific protocol.

Ref link (still a WiP) - https://github.com/diasdavid/specs/blob/protocol-spec/protocol/layers.md#network-layer

# Usage

## API calls

.openStream
.registerHandle

## Events emmited

.on('error')

.on('connection')
.on('connection-unknown')

.on('stream')
.on('stream-unknown')
