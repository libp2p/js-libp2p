'use strict'

const test = require('tape')
const libp2p = require('libp2p')
const WebSockets = require('libp2p-websockets')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const pull = require('pull-stream')
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

test('story 2 - peerA', (t) => {
  t.plan(6)
  let node

  waterfall([
    (cb) => PeerInfo.create(PeerA, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10000/ws')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => {
    t.ifErr(err, 'created Node')
    t.ok(node.isStarted(), 'PeerA is running')

    const PeerBAddr = `/ip4/127.0.0.1/tcp/10001/ws/ipfs/${PeerB.id}`

    node.dial(PeerBAddr, '/echo/1.0.0', (err, conn) => {
      t.ifErr(err, 'dial successful')

      const data = Buffer.from('Heey')

      pull(
        pull.values([data]),
        conn,
        pull.collect((err, values) => {
          t.ifErr(err, 'Received echo back')
          t.deepEqual(values[0], data)
          node.stop((err) => t.ifErr(err, 'PeerA has stopped'))
        })
      )
    })
  })
})
