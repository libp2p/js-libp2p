'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const Node = require('libp2p-ipfs-nodejs')
const waterfall = require('async/waterfall')
const expect = require('chai').expect

exports.first = (map) => map.values().next().value

exports.expectSet = (set, subs) => {
  expect(Array.from(set.values())).to.eql(subs)
}

exports.createNode = (maddr, callback) => {
  waterfall([
    (cb) => PeerId.create({ bits: 1024 }, cb),
    (id, cb) => PeerInfo.create(id, cb),
    (peer, cb) => {
      peer.multiaddrs.add(multiaddr(maddr))
      cb(null, new Node(peer))
    },
    (node, cb) => {
      node.start((err) => {
        if (err) {
          return cb(err)
        }
        cb(null, node)
      })
    }
  ], callback)
}
