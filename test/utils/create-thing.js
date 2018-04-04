'use strict'

const waterfall = require('async/waterfall')

const ConnManager = require('../../')

const createTempRepo = require('./create-temp-repo-nodejs')
const createLibp2pNode = require('./create-libp2p-node')

module.exports = (options, callback) => {
  waterfall([
    (cb) => createTempRepo(cb),
    (repo, cb) => {
      createLibp2pNode({}, (err, node) => cb(err, repo, node))
    },
    (repo, libp2pNode, cb) => {
      const connManager = new ConnManager(libp2pNode, options)
      connManager.start()
      cb(null, repo, libp2pNode, connManager)
    }
  ], (err, repo, libp2pNode, connManager) => {
    callback(err, {
      repo: repo,
      libp2pNode: libp2pNode,
      connManager: connManager
    })
  })
}
