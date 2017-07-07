'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const pull = require('pull-stream')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()]
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

function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
}

parallel([
  (cb) => createNode(cb),
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]

  printAddrs(node1, '1')
  printAddrs(node2, '2')

  node2.handle('/print', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  node1.dial(node2.peerInfo, '/print', (err, conn) => {
    if (err) { throw err }

    pull(pull.values(['Hello', ' ', 'p2p', ' ', 'world', '!']), conn)
  })
})
