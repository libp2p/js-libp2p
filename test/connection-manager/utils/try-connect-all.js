'use strict'

const mapSeries = require('async/mapSeries')
const eachSeries = require('async/eachSeries')

module.exports = (nodes, callback) => {
  mapSeries(
    nodes,
    (node, cb) => {
      const connectedTo = []
      eachSeries(
        nodes.filter(n => node != n),
        (otherNode, cb) => {
          const otherNodePeerInfo = otherNode.peerInfo
          node.dial(otherNodePeerInfo, (err) => {
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
