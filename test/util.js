'use strict'

const times = require('async/times')
const each = require('async/each')
const series = require('async/series')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const leftPad = require('left-pad')
const setImmediate = require('async/setImmediate')
const MemoryDatastore = require('interface-datastore').MemoryDatastore
const Libp2p = require('libp2p-ipfs-nodejs')
const multihashing = require('multihashing-async')
const crypto = require('libp2p-crypto')
const CID = require('cids')
const waterfall = require('async/waterfall')

const KadDHT = require('../src')

exports.makePeers = (n, callback) => {
  times(n, (i, cb) => {
    PeerId.create({bits: 1024}, cb)
  }, (err, ids) => {
    if (err) {
      return callback(err)
    }
    callback(null, ids.map((i) => new PeerInfo(i)))
  })
}

let nodes = []
let i = 0

exports.setupDHT = (callback) => {
  exports.makePeers(1, (err, peers) => {
    if (err) {
      return callback(err)
    }

    const p = peers[0]
    p.multiaddrs.add(`ip4/127.0.0.1/tcp/9${leftPad(i++, 3, 0)}`)

    const libp2p = new Libp2p(p, undefined, { mdns: false })
    const dht = new KadDHT(libp2p, 20, new MemoryDatastore())

    dht.validators.v = {
      func (key, publicKey, callback) {
        setImmediate(callback)
      },
      sign: false
    }

    dht.selectors.v = (k, records) => 0

    series([
      (cb) => libp2p.start(cb),
      (cb) => dht.start(cb)
    ], (err) => {
      if (err) {
        return callback(err)
      }
      nodes.push(dht)
      callback(null, dht)
    })
  })
}

exports.teardown = (callback) => {
  each(nodes, (n, cb) => {
    series([
      (cb) => n.stop(cb),
      (cb) => n.libp2p.stop(cb)
    ], cb)
  }, (err) => {
    // ignoring error, just shut it down
    nodes = []
    i = 0
    callback(err)
  })
}

exports.makeValues = (n, callback) => {
  times(n, (i, cb) => {
    const bytes = crypto.randomBytes(32)

    waterfall([
      (cb) => multihashing(bytes, 'sha2-256', cb),
      (h, cb) => cb(null, {cid: new CID(h), value: bytes})
    ], cb)
  }, callback)
}
