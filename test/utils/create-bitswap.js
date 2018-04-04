'use strict'

const waterfall = require('async/waterfall')

const Bitswap = require('../..')
const createTempRepo = require('./create-temp-repo-nodejs')
const createLibp2pNode = require('./create-libp2p-node')

module.exports = (callback) => {
  waterfall([
    (cb) => createTempRepo(cb),
    (repo, cb) => {
      createLibp2pNode({
        DHT: repo.datastore
      }, (err, node) => cb(err, repo, node))
    },
    (repo, libp2pNode, cb) => {
      const bitswap = new Bitswap(libp2pNode, repo.blocks)
      bitswap.start((err) => cb(err, {
        bitswap: bitswap,
        repo: repo,
        libp2pNode: libp2pNode
      }))
    }
  ], callback)
}
