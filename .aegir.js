'use strict'

const Node = require('./test/nodejs-bundle/nodejs-bundle.js')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const pull = require('pull-stream')

const sigServer = require('libp2p-webrtc-star/src/sig-server')
const WSsigServer = require('libp2p-websocket-star-rendezvous')
let server
let server2

let node
const rawPeer = require('./test/browser-bundle/peer.json')

const before = (done) => {
  let count = 0
  const ready = () => ++count === 2 ? done() : null

  sigServer.start({
    port: 15555
  }, (err, _server) => {
    if (err) {
      throw err
    }
    server = _server
    ready()
  })

  WSsigServer.start({
    port: 14444,
    refreshPeerListIntervalMS: 1000,
    strictMultiaddr: false
  }, (err, _server) => {
    if (err) {
      throw err
    }
    server2 = _server
    ready()
  })

  PeerId.createFromJSON(rawPeer, (err, peerId) => {
    if (err) {
      return done(err)
    }
    const peer = new PeerInfo(peerId)

    peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9200/ws')

    node = new Node(peer)
    node.handle('/echo/1.0.0', (protocol, conn) => pull(conn, conn))
    node.start(() => ready())
  })
}

const after = (done) => {
  setTimeout(() => require('async/each')([node, server, server2], (s, n) => s.stop(n), done), 2000)
}

module.exports = {
  hooks: {
    pre: before,
    post: after
  }
}
