'use strict'

const test = require('tape')
const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const pull = require('pull-stream')
const PeerB = require('libp2p-interop/peer-b.json')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()]
    }
    super(modules, peerInfo)
  }
}

test('story 1 - peerB', (t) => {
  t.plan(5)
  let node

  waterfall([
    (cb) => PeerInfo.create(PeerB, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10001')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => {
    t.ifErr(err)
    t.ok(node.isStarted(), 'PeerB is running')

    node.handle('/echo/1.0.0', (protocol, conn) => {
      pull(
        conn,
        conn,
        pull.onEnd((err) => {
          t.ifErr(err)
          t.pass('Received End of Connection')
          node.stop((err) => {
            t.ifErr(err, 'PeerB has stopped')
          })
        })
      )
    })
  })
})
