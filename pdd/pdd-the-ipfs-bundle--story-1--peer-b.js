'use strict'

const test = require('tape')
const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const SECIO = require('libp2p-secio')
const Multiplex = require('libp2p-multiplex')
const Railing = require('libp2p-railing')
const MulticastDNS = require('libp2p-mdns')
const KadDHT = require('libp2p-kad-dht')
const PeerInfo = require('peer-info')
const pull = require('pull-stream')
const waterfall = require('async/waterfall')
const series = require('async/series')
const PeerA = require('libp2p-interop/peer-a.json')
const PeerB = require('libp2p-interop/peer-b.json')

class IPFSBundle extends libp2p {
  constructor (peerInfo, options) {
    options = Object.assign({ bootstrap: [] }, options)

    const modules = {
      transport: [
        new TCP(),
        new WebSockets()
      ],
      connection: {
        muxer: [
          Multiplex
        ],
        crypto: [
          SECIO
        ]
      },
      discovery: [
        new MulticastDNS(peerInfo, 'ipfs.local'),
        new Railing(options.bootstrap)
      ],
      DHT: KadDHT
    }

    super(modules, peerInfo, undefined, options)
  }
}

test('story 1 - peerA', (t) => {
  t.plan(8)
  let node

  waterfall([
    (cb) => PeerInfo.create(PeerB, cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/10001')
      node = new IPFSBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => {
    t.ifErr(err, 'created Node successfully')
    t.ok(node.isStarted(), 'PeerB is Running')

    const peerAAddr = `/ip4/127.0.0.1/tcp/10000/ipfs/${PeerA.id}`

    node.handle('/echo/1.0.0', (protocol, conn) => {
      pull(
        conn,
        conn,
        pull.onEnd((err) => t.ifErr(err, 'echo was successful'))
      )
    })

    series([
      (cb) => setTimeout(cb, 5 * 1000), // time to run both scripts
      (cb) => node.ping(peerAAddr, (err, p) => {
        t.ifErr(err, 'initiated Ping to PeerA')
        p.once('error', (err) => t.ifErr(err, 'Ping should not fail'))
        p.once('ping', (time) => {
          t.pass('ping PeerA successfully')
          p.stop()
          cb()
        })
      }),
      (cb) => node.dial(peerAAddr, '/time/1.0.0', (err, conn) => {
        t.ifErr(err, 'dial successful')

        pull(
          pull.values([]),
          conn,
          pull.collect((err, values) => {
            t.ifErr(err, 'Received time')
            cb()
          })
        )
      }),
      (cb) => setTimeout(cb, 2 * 1000) // time to both finish
    ], () => node.stop((err) => t.ifErr(err, 'PeerB has stopped')))
  })
})
