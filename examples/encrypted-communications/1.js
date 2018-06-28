'use strict'

const libp2p = require('../../')
const TCP = require('libp2p-tcp')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const pull = require('pull-stream')
const defaultsDeep = require('@nodeutils/defaults-deep')

class MyBundle extends libp2p {
  constructor (_options) {
    const defaults = {
      modules: {
        transport: [ TCP ],
        streamMuxer: [ SPDY ],
        connEncryption: [ SECIO ]
      }
    }

    super(defaultsDeep(_options, defaults))
  }
}

function createNode (callback) {
  let node

  waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      node = new MyBundle({
        peerInfo
      })
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

  node2.handle('/a-protocol', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  node1.dialProtocol(node2.peerInfo, '/a-protocol', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['This information is sent out encrypted to the other peer']), conn)
  })
})
