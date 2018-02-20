/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const Node = require('./bundle-nodejs')

function createNode (multiaddrs, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  options = options || {}

  if (!Array.isArray(multiaddrs)) {
    multiaddrs = [multiaddrs]
  }

  waterfall([
    (cb) => PeerId.create({ bits: 512 }, cb),
    (peerId, cb) => PeerInfo.create(peerId, cb),
    (peerInfo, cb) => {
      multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma))
      options.peerInfo = peerInfo
      cb(null, new Node(options))
    }
  ], callback)
}

module.exports = createNode
