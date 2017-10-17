'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const SPDY = require('libp2p-spdy')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [SPDY]
      }
    }
    super(modules, peerInfo)
  }
}

function createNode (callback) {
  let node

  waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => callback(err, node))
}

parallel([
  (cb) => createNode(cb),
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]

  node1.handle('/node-1', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  node2.handle('/node-2', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  series([
    (cb) => node1.dial(node2.peerInfo, '/node-2', (err, conn) => {
      if (err) { throw err }
      pull(pull.values(['from 1 to 2']), conn)
      cb()
    }),
    (cb) => node2.dial(node1.peerInfo, '/node-1', (err, conn) => {
      if (err) { throw err }
      pull(pull.values(['from 2 to 1']), conn)
      cb()
    })
  ], (err) => {
    if (err) { throw err }
    console.log('Addresses by which both peers are connected')
    node1.peerBook
      .getAllArray()
      .forEach((peer) => console.log('node 1 to node 2:', peer.isConnected().toString()))
    node2.peerBook
      .getAllArray()
      .forEach((peer) => console.log('node 2 to node 1:', peer.isConnected().toString()))
  })
})
