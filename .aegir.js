'use strict'

const pull = require('pull-stream')
const WebSocketStarRendezvous = require('libp2p-websocket-star-rendezvous')
const sigServer = require('libp2p-webrtc-star/src/sig-server')
const promisify = require('promisify-es6')
const mplex = require('pull-mplex')
const spdy = require('libp2p-spdy')
const PeerBook = require('peer-book')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const path = require('path')
const Switch = require('./src/switch')
const WebSockets = require('libp2p-websockets')

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
let switchA
let switchB

function echo (protocol, conn) { pull(conn, conn) }
function idJSON (id) {
  const p = path.join(__dirname, `./test/switch/test-data/id-${id}.json`)
  return require(p)
}

function createSwitchA () {
  return new Promise((resolve, reject) => {
    PeerId.createFromJSON(idJSON(1), (err, id) => {
      if (err) { return reject(err) }

      const peerA = new PeerInfo(id)
      const maA = '/ip4/127.0.0.1/tcp/15337/ws'

      peerA.multiaddrs.add(maA)
      const sw = new Switch(peerA, new PeerBook())

      sw.transport.add('ws', new WebSockets())
      sw.start((err) => {
        if (err) { return reject(err) }
        resolve(sw)
      })
    })
  })
}

function createSwitchB () {
  return new Promise((resolve, reject) => {
    PeerId.createFromJSON(idJSON(2), (err, id) => {
      if (err) { return reject(err) }

      const peerB = new PeerInfo(id)
      const maB = '/ip4/127.0.0.1/tcp/15347/ws'

      peerB.multiaddrs.add(maB)
      const sw = new Switch(peerB, new PeerBook())

      sw.transport.add('ws', new WebSockets())
      sw.connection.addStreamMuxer(mplex)
      sw.connection.addStreamMuxer(spdy)
      sw.connection.reuse()
      sw.handle('/echo/1.0.0', echo)
      sw.start((err) => {
        if (err) { return reject(err) }
        resolve(sw)
      })
    })
  })
}

const before = async () => {
  [
    wrtcRendezvous,
    wsRendezvous,
    peerInfo,
    switchA,
    switchB
  ] = await Promise.all([
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
    getPeerRelay(),
    createSwitchA(),
    createSwitchB()
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
    node.stop(),
    promisify(switchA.stop, { context: switchA })(),
    promisify(switchB.stop, { context: switchB })()
  ])
}

module.exports = {
  bundlesize: { maxSize: '220kB' },
  hooks: {
    pre: before,
    post: after
  }
}
