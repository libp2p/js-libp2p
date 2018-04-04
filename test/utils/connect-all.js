'use strict'

const eachSeries = require('async/eachSeries')
const without = require('lodash.without')

module.exports = (nodes, callback) => {
  console.log('nodes:', nodes.map((node) => node.libp2pNode.peerInfo.id.toB58String()))
  eachSeries(
    nodes,
    (node, cb) => {
      eachSeries(
        without(nodes, node),
        (otherNode, cb) => {
          console.log('connecting %s to %s', node.libp2pNode.peerInfo.id.toB58String(), otherNode.libp2pNode.peerInfo.id.toB58String())
          node.libp2pNode.dial(otherNode.libp2pNode.peerInfo, (err, results) => {
            if (err) {
              return cb(err)
            }
            console.log('CONNECTED %s to %s', node.libp2pNode.peerInfo.id.toB58String(), otherNode.libp2pNode.peerInfo.id.toB58String())
            cb(null, results)
          })
        },
        cb
      )
    },
    callback
  )
}
