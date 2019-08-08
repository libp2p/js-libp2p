'use strict'

const eachSeries = require('async/eachSeries')

module.exports = (nodes, callback) => {
  eachSeries(
    nodes,
    (node, cb) => {
      eachSeries(
        nodes.filter(n => node != n),
        (otherNode, cb) => node.dial(otherNode.peerInfo, cb),
        cb
      )
    },
    callback
  )
}
