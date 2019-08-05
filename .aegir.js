'use strict'

const pull = require('pull-stream')
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
let peerInfo

const before = async () => {
  [wrtcRendezvous, wsRendezvous, peerInfo] = await Promise.all([
    sigServer.start({
      port: WRTC_RENDEZVOUS_MULTIADDR.nodeAddress().port
      // cryptoChallenge: true TODO: needs https://github.com/libp2p/js-libp2p-webrtc-star/issues/128
    }),
    WebSocketStarRendezvous.start({
      port: WS_RENDEZVOUS_MULTIADDR.nodeAddress().port,
      refreshPeerListIntervalMS: 1000,
      strictMultiaddr: false,
      cryptoChallenge: true
    }),
    getPeerRelay()
  ])

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
  await node.start()
}

const after = () => {
  return Promise.all([
    wrtcRendezvous.stop(),
    wsRendezvous.stop(),
    node.stop()
  ])
}

module.exports = {
  bundlesize: { maxSize: '220kB' },
  hooks: {
    pre: before,
    post: after
  }
}
