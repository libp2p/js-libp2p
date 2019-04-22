'use strict'

const each = require('async/each')
const series = require('async/series')
const setImmediate = require('async/setImmediate')
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const times = require('async/times')

const createPeerInfo = require('./create-peer-info')

const KadDHT = require('../../src')

class TestDHT {
  constructor () {
    this.nodes = []
  }

  spawn (n, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    times(n, (i, cb) => this._spawnOne(options, cb), (err, dhts) => {
      if (err) { return callback(err) }
      callback(null, dhts)
    })
  }

  _spawnOne (options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    // Disable random walk by default for more controlled testing
    options = {
      randomWalk: {
        enabled: false
      },
      ...options
    }

    createPeerInfo(1, (err, peers) => {
      if (err) { return callback(err) }

      const p = peers[0]
      p.multiaddrs.add('/ip4/127.0.0.1/tcp/0')

      const sw = new Switch(p, new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()

      const dht = new KadDHT(sw, options)

      dht.validators.v = {
        func (key, publicKey, callback) {
          setImmediate(callback)
        },
        sign: false
      }

      dht.validators.v2 = dht.validators.v // added to simulate just validators available

      dht.selectors.v = (k, records) => 0

      series([
        (cb) => sw.start(cb),
        (cb) => dht.start(cb)
      ], (err) => {
        if (err) { return callback(err) }
        this.nodes.push(dht)
        callback(null, dht)
      })
    })
  }

  teardown (callback) {
    each(this.nodes, (n, cb) => {
      series([
        (cb) => n.stop(cb),
        (cb) => n.switch.stop(cb)
      ], cb)
    }, (err) => {
      this.nodes = []
      callback(err)
    })
  }
}

module.exports = TestDHT
