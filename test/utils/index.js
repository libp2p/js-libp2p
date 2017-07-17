'use strict'

const times = require('async/times')
const each = require('async/each')
const series = require('async/series')
const setImmediate = require('async/setImmediate')
const multihashing = require('multihashing-async')
const waterfall = require('async/waterfall')
const CID = require('cids')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const crypto = require('libp2p-crypto')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')

const KadDHT = require('../../src')

// Creates multiple PeerInfos
exports.makePeers = (n, callback) => {
  times(n, (i, cb) => PeerId.create({bits: 1024}, cb), (err, ids) => {
    if (err) {
      return callback(err)
    }
    callback(null, ids.map((i) => new PeerInfo(i)))
  })
}

// TODO break this setupDHT to be a self contained thing.
let nodes = []

exports.setupDHT = (callback) => {
  exports.makePeers(1, (err, peers) => {
    if (err) {
      return callback(err)
    }

    const p = peers[0]
    p.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

    const swarm = new Swarm(p, new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.connection.addStreamMuxer(Multiplex)
    swarm.connection.reuse()

    const dht = new KadDHT(swarm)

    dht.validators.v = {
      func (key, publicKey, callback) {
        setImmediate(callback)
      },
      sign: false
    }

    dht.selectors.v = (k, records) => 0

    series([
      (cb) => swarm.listen(cb),
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
      (cb) => n.swarm.close(cb)
    ], cb)
  }, (err) => {
    nodes = []
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
