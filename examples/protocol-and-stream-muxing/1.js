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

parallel([
  (cb) => createNode(cb),
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]

  // exact matching
  node2.handle('/your-protocol', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })

  // semver matching
  /*
  node2.handle('/another-protocol/1.0.1', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  })
  */

  // custom func matching
  /*
  node2.handle('/custom-match-func', (protocol, conn) => {
    pull(
      conn,
      pull.map((v) => v.toString()),
      pull.log()
    )
  }, (myProtocol, requestedProtocol, callback) => {
    if (myProtocol.indexOf(requestedProtocol)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  })
  */

  node1.dial(node2.peerInfo, '/your-protocol', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['my own protocol, wow!']), conn)
  })

  /*
  node1.dial(node2.peerInfo, '/another-protocol/1.0.0', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['semver me please']), conn)
  })
  */

  /*
  node1.dial(node2.peerInfo, '/custom-match-func/some-query', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['do I fall into your criteria?']), conn)
  })
  */
})
