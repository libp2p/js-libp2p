'use strict'

const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')
const libp2p = require('libp2p')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')

class Node extends libp2p {
  constructor (peerInfo, options) {
    options = options || {}

    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: Multiplex,
        crypto: SECIO
      }
    }

    super(modules, peerInfo, null, options.DHT || {})
  }
}

function createLibp2pNode (options, callback) {
  let node

  waterfall([
    (cb) => PeerId.create({bits: 1024}, cb),
    (id, cb) => PeerInfo.create(id, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')
      node = new Node(peerInfo, options)
      node.start(cb)
    }
  ], (err) => callback(err, node))
}

exports = module.exports = createLibp2pNode
exports.bundle = Node
