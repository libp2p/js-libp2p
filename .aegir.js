'use strict'

const pull = require('pull-stream')
const parallel = require('async/parallel')
const WebSocketStarRendezvous = require('libp2p-websocket-star-rendezvous')
const sigServer = require('libp2p-webrtc-star/src/sig-server')

const Node = require('./test/utils/bundle-nodejs.js')
const {
  getPeerRelay,
  WRTC_RENDEZVOUS_MULTIADDR,
  WS_RENDEZVOUS_MULTIADDR
} = require('./test/utils/constants')

let wrtcRendezvous
let wsRendezvous
let node

const before = (done) => {
  parallel([
    (cb) => {
      sigServer.start({
        port: WRTC_RENDEZVOUS_MULTIADDR.nodeAddress().port
        // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
      }, (err, server) => {
        if (err) {
          return cb(err)
        }
        wrtcRendezvous = server
        cb()
      })
    },
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

        node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
        node.start(cb)
      })
    }
  ], done)
}

const after = (done) => {
  setTimeout(() =>
    parallel(
      [node, wrtcRendezvous, wsRendezvous].map((s) => (cb) => s.stop(cb)),
      done),
  2000)
}

module.exports = {
  bundlesize: { maxSize: '217kB' },
  hooks: {
    pre: before,
    post: after
  }
}
