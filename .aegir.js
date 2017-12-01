'use strict'

const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')
const parallel = require('async/parallel')

const rawPeer = require('./test/fixtures/test-peer.json')
const Node = require('./test/utils/bundle.node.js')
const sigServer = require('libp2p-webrtc-star/src/sig-server')
const WebSocketStarRendezvous = require('libp2p-websocket-star-rendezvous')

let wrtcRendezvous
let wsRendezvous
let node

const before = (done) => {
  parallel([
    (cb) => {
      sigServer.start({
        port: 15555
        // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
      }, (err, server) => {
        if (err) { return cb(err) }
        wrtcRendezvous = server
        cb()
      })
    },
    (cb) => {
      WebSocketStarRendezvous.start({
        port: 14444,
        refreshPeerListIntervalMS: 1000,
        strictMultiaddr: false,
        cryptoChallenge: true
      }, (err, _server) => {
        if (err) { return cb(err) }
        wsRendezvous = _server
        cb()
      })
    },
    (cb) => {
      PeerId.createFromJSON(rawPeer, (err, peerId) => {
        if (err) {
          return done(err)
        }
        const peer = new PeerInfo(peerId)

        peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9200/ws')

        node = new Node(peer)
        node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
        node.start(cb)
      })
    }
  ], done)
}

const after = (done) => {
  setTimeout(() => parallel(
    [node, wrtcRendezvous, wsRendezvous].map((s) => {
      return (cb) => s.stop(cb)
    })
   , done), 2000)
}

module.exports = {
  hooks: {
    pre: before,
    post: after
  }
}
