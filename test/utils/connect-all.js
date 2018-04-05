'use strict'

const eachSeries = require('async/eachSeries')
const without = require('lodash.without')

module.exports = (nodes, callback) => {
  eachSeries(
    nodes,
    (node, cb) => {
      eachSeries(
        without(nodes, node),
        (otherNode, cb) => node.libp2pNode.dial(otherNode.libp2pNode.peerInfo, cb),
        cb
      )
    },
    callback
  )
}
