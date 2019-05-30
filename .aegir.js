'use strict'

const pull = require('pull-stream')
const parallel = require('async/parallel')
const WebSocketStarRendezvous = require('libp2p-websocket-star-rendezvous')

const Node = require('./test/utils/nodejs-bundle.js')
const {
  getPeerRelay,
  WS_RENDEZVOUS_MULTIADDR
} = require('./test/utils/constants')

let wsRendezvous
let node

const before = (done) => {
  parallel([
    (cb) => {
      WebSocketStarRendezvous.start({
        port: WS_RENDEZVOUS_MULTIADDR.nodeAddress().port,
        refreshPeerListIntervalMS: 1000,
        strictMultiaddr: false,
        cryptoChallenge: true
      }, (err, _server) => {
        if (err) {
          return cb(err)
        }
        wsRendezvous = _server
        cb()
      })
    },
    (cb) => {
      getPeerRelay((err, peerInfo) => {
        if (err) {
          return done(err)
        }

        node = new Node({
          peerInfo,
          config: {
            relay: {
              enabled: true,
              hop: {
                enabled: true,
                active: true
              }
            }
          }
        })

        node.handle('/echo/1.0.0', (_, conn) => pull(conn, conn))
        node.start(cb)
      })
    }
  ], done)
}

const after = (done) => {
  setTimeout(() =>
    parallel(
      [node, wsRendezvous].map((s) => (cb) => s.stop(cb)),
      done),
    2000)
}

module.exports = {
  hooks: {
    pre: before,
    post: after
  }
}
