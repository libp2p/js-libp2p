'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('./nodejs-bundle')
const waterfall = require('async/waterfall')

exports.createNode = (maddr, callback) => {
  waterfall([
    (cb) => PeerId.create({ bits: 1024 }, cb),
    (id, cb) => PeerInfo.create(id, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add(maddr)
      cb(null, new Node({ peerInfo }))
    },
    (node, cb) => node.start((err) => cb(err, node))
  ], callback)
}
