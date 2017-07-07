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

  node2.handle('/a', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  node2.handle('/b', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  series([
    (cb) => node1.dial(node2.peerInfo, '/a', (err, conn) => {
      if (err) { throw err }
      pull(pull.values(['protocol (a)']), conn)
      cb()
    }),
    (cb) => node1.dial(node2.peerInfo, '/b', (err, conn) => {
      if (err) { throw err }
      pull(pull.values(['protocol (b)']), conn)
      cb()
    }),
    (cb) => node1.dial(node2.peerInfo, '/b', (err, conn) => {
      if (err) { throw err }
      pull(pull.values(['another conn on protocol (b)']), conn)
      cb()
    })
  ])
})
