'use strict'

const Benchmark = require('benchmark')
const crypto = require('crypto')
const map = require('async/map')
const parallel = require('async/parallel')

const PSG = require('../src')
const utils = require('../test/utils')

const suite = new Benchmark.Suite('pubsub')

// Simple benchmark, how many messages can we send from
// one node to another.

map([0, 1], (i, cb) => {
  utils.createNode('/ip4/127.0.0.1/tcp/0', (err, node) => {
    if (err) {
      return cb(err)
    }

    cb(null, {
      libp2p: node,
      ps: new PSG(node)
    })
  })
}, (err, peers) => {
  if (err) {
    throw err
  }

  parallel([
    (cb) => peers[0].libp2p.dialByPeerInfo(peers[1].libp2p.peerInfo, cb),
    (cb) => setTimeout(() => {
      peers[0].ps.subscribe('Z')
      peers[1].ps.subscribe('Z')
      cb(null, peers)
    }, 200)
  ], (err, res) => {
    if (err) {
      throw err
    }
    const peers = res[1]

    suite.add('publish and receive', (deferred) => {
      const onMsg = (msg) => {
        deferred.resolve()
        peers[1].ps.removeListener('Z', onMsg)
      }

      peers[1].ps.on('Z', onMsg)

      peers[0].ps.publish('Z', crypto.randomBytes(1024))
    }, {
      defer: true
    })

    suite
      .on('cycle', (event) => {
        console.log(String(event.target))
      })
      .on('complete', () => {
        process.exit()
      })
      .run({
        async: true
      })
  })
})
