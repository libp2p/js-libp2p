/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const Node = require('./nodejs-bundle')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const pull = require('pull-stream')

function createNode (multiaddrs, options, callback) {
  options = options || {}
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  if (!Array.isArray(multiaddrs)) {
    multiaddrs = [multiaddrs]
  }

  waterfall([
    (cb) => PeerId.create({ bits: 1024 }, cb),
    (peerId, cb) => PeerInfo.create(peerId, cb),
    (peerInfo, cb) => {
      multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma))
      cb(null, peerInfo)
    },
    (peerInfo, cb) => {
      const node = new Node(peerInfo, undefined, options)
      cb(null, node)
    }
  ], callback)
}

function echo (protocol, conn) {
  pull(conn, conn)
}

module.exports = {
  createNode: createNode,
  echo: echo
}
