'use strict'

const test = require('tape')
const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const PeerA = require('libp2p-interop/peer-a.json')
const PeerB = require('libp2p-interop/peer-b.json')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()]
    }
    super(modules, peerInfo)
  }
}

test('story 3 - peerA', (t) => {
  t.plan(4)
  let node

  waterfall([
    (cb) => PeerInfo.create(PeerA, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10000')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => {
    t.ifErr(err, 'created Node')
    t.ok(node.isStarted(), 'PeerA is running')

    const PeerBAddr = `/ip4/127.0.0.1/tcp/10001/ws/ipfs/${PeerB.id}`

    setTimeout(() => node.dial(PeerBAddr, '/echo/1.0.0', (err, conn) => {
      t.ok(err, 'dial failed')
      node.stop((err) => t.ifErr(err, 'PeerA has stopped'))
    }), 1000)
  })
})
