#! /usr/bin/env node

'use strict'

const Node = require('./nodejs-bundle')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')

const idBak = require('./test-data/test-id.json')

PeerId.createFromJSON(idBak, (err, peerId) => {
  if (err) {
    throw err
  }

  const peerInfo = new PeerInfo(peerId)

  peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/12345')

  const node = new Node(peerInfo)

  node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))

  node.start((err) => {
    if (err) { throw err }

    console.log('Spawned node started, env:', process.env.LIBP2P_MUXER)
  })
})
