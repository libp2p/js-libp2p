'use strict'

const mapSeries = require('async/mapSeries')
const eachSeries = require('async/eachSeries')
const without = require('lodash.without')

module.exports = (nodes, callback) => {
  mapSeries(
    nodes,
    (node, cb) => {
      const connectedTo = []
      eachSeries(
        without(nodes, node),
        (otherNode, cb) => {
          const otherNodePeerInfo = otherNode.libp2pNode.peerInfo
          node.libp2pNode.dial(otherNodePeerInfo, (err) => {
            if (!err) {
              connectedTo.push(otherNodePeerInfo.id.toB58String())
            }
            cb()
          })
        },
        (err) => cb(err, connectedTo)
      )
    },
    callback
  )
}
