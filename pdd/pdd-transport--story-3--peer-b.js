'use strict'

const test = require('tape')
const libp2p = require('libp2p')
const WebSockets = require('libp2p-websockets')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const PeerA = require('libp2p-interop/peer-a.json')
const PeerB = require('libp2p-interop/peer-b.json')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new WebSockets()]
    }
    super(modules, peerInfo)
  }
}

test('story 3 - peerB', (t) => {
  t.plan(4)
  let node

  waterfall([
    (cb) => PeerInfo.create(PeerB, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10000/ws')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => {
    t.ifErr(err, 'created Node')
    t.ok(node.isStarted(), 'PeerA is running')

    const PeerAAddr = `/ip4/127.0.0.1/tcp/10000/ws/ipfs/${PeerA.id}`

    setTimeout(() => node.dial(PeerAAddr, '/echo/1.0.0', (err, conn) => {
      t.ok(err, 'dial failed')
      node.stop((err) => t.ifErr(err, 'PeerA has stopped'))
    }), 1000)
  })
})
