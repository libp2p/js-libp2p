'use strict'

const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const libp2p = require('../../../src')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')

const ConnManager = require('libp2p-connection-manager')

class Node extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [TCP],
      streamMuxer: [Multiplex],
      connEncryption: [SECIO]
    }

    super({
      peerInfo,
      modules,
      config: {
        peerDiscovery: {
          autoDial: false
        }
      }
    })
  }
}

function createLibp2pNode (options, callback) {
  let node

  waterfall([
    (cb) => PeerId.create({ bits: 1024 }, cb),
    (id, cb) => PeerInfo.create(id, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
      node = new Node(peerInfo)
      // Replace the connection manager so we use source code instead of dep code
      node.connectionManager = new ConnManager(node, options)
      node.start(cb)
    }
  ], (err) => callback(err, node))
}

exports = module.exports = createLibp2pNode
exports.bundle = Node
