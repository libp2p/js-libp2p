/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const series = require('async/series')
const times = require('async/times')
const parallel = require('async/parallel')
const timeout = require('async/timeout')
const retry = require('async/retry')
const each = require('async/each')
const waterfall = require('async/waterfall')
const random = require('lodash.random')
const Buffer = require('safe-buffer').Buffer
const _ = require('lodash')
const Record = require('libp2p-record').Record
const PeerBook = require('peer-book')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')

const KadDHT = require('../src')
const kadUtils = require('../src/utils')
const c = require('../src/constants')

const utils = require('./utils')
const makePeers = utils.makePeers
const setupDHT = utils.setupDHT
const makeValues = utils.makeValues

describe('KadDHT', () => {
  let peerInfos
  let values

  before(function (done) {
    this.timeout(10 * 1000)

    parallel([
      (cb) => makePeers(3, cb),
      (cb) => makeValues(20, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      peerInfos = res[0]
      values = res[1]
      done()
    })
  })

  // Give the nodes some time to finish request
  afterEach(function (done) {
    this.timeout(10 * 1000)

    utils.teardown(done)
  })

  it('create', () => {
    const swarm = new Swarm(peerInfos[0], new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.connection.addStreamMuxer(Multiplex)
    swarm.connection.reuse()
    const dht = new KadDHT(swarm, { kBucketSize: 5 })

    expect(dht).to.have.property('peerInfo').eql(peerInfos[0])
    expect(dht).to.have.property('swarm').eql(swarm)
    expect(dht).to.have.property('kBucketSize', 5)
    expect(dht).to.have.property('routingTable')
  })

  it('put - get', function (done) {
    this.timeout(10 * 1000)

    times(2, (i, cb) => setupDHT(cb), (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      waterfall([
        (cb) => connect(dhtA, dhtB, cb),
        (cb) => dhtA.put(Buffer.from('/v/hello'), Buffer.from('world'), cb),
        (cb) => dhtB.get(Buffer.from('/v/hello'), 1000, cb),
        (res, cb) => {
          expect(res).to.eql(Buffer.from('world'))
          cb()
        }
      ], done)
    })
  })

  it('provides', function (done) {
    this.timeout(20 * 1000)

    setupDHTs(4, (err, dhts, addrs, ids) => {
      expect(err).to.not.exist()
      waterfall([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => connect(dhts[2], dhts[3], cb),
        (cb) => each(values, (v, cb) => {
          dhts[3].provide(v.cid, cb)
        }, cb),
        (cb) => {
          let n = 0
          each(values, (v, cb) => {
            n = (n + 1) % 3
            dhts[n].findProviders(v.cid, 5000, (err, provs) => {
              expect(err).to.not.exist()
              expect(provs).to.have.length(1)
              expect(provs[0].id.id).to.be.eql(ids[3].id)
              expect(
                provs[0].multiaddrs.toArray()[0].toString()
              ).to.be.eql(
                addrs[3].toString()
              )
              cb()
            })
          }, cb)
        }
      ], done)
    })
  })

  it('bootstrap', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 20

    setupDHTs(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      waterfall([
        // ring connect
        (cb) => times(nDHTs, (i, cb) => {
          connect(dhts[i], dhts[(i + 1) % nDHTs], cb)
        }, (err) => cb(err)),
        (cb) => {
          bootstrap(dhts)
          waitForWellFormedTables(dhts, 7, 0, 20 * 1000, cb)
          cb()
        }
      ], done)
    })
  })

  it('layered get', function (done) {
    this.timeout(40 * 1000)

    setupDHTs(4, (err, dhts) => {
      expect(err).to.not.exist()

      waterfall([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => connect(dhts[2], dhts[3], cb),
        (cb) => dhts[3].put(
          new Buffer('/v/hello'),
          new Buffer('world'),
          cb
        ),
        (cb) => dhts[0].get(new Buffer('/v/hello'), 1000, cb),
        (res, cb) => {
          expect(res).to.be.eql(new Buffer('world'))
          cb()
        }
      ], done)
    })
  })

  it.skip('findPeer', function (done) {
    this.timeout(40 * 1000)

    setupDHTs(4, (err, dhts, addrs, ids) => {
      expect(err).to.not.exist()

      waterfall([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => connect(dhts[2], dhts[3], cb),
        (cb) => dhts[0].findPeer(ids[3], 1000, cb),
        (res, cb) => {
          expect(res.id.isEqual(ids[3])).to.eql(true)
          cb()
        }
      ], done)
    })
  })

  it('connect by id to with address in the peerbook ', function (done) {
    this.timeout(20 * 1000)

    parallel([
      (cb) => setupDHT(cb),
      (cb) => setupDHT(cb)
    ], (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      const peerA = dhtA.peerInfo
      const peerB = dhtB.peerInfo
      dhtA.peerBook.put(peerB)
      dhtB.peerBook.put(peerA)

      parallel([
        (cb) => dhtA.swarm.dial(peerB.id, cb),
        (cb) => dhtB.swarm.dial(peerA.id, cb)
      ], done)
    })
  })

  // TODO fix this
  it.skip('find peer query', function (done) {
    this.timeout(40 * 1000)

    setupDHTs(101, (err, dhts, addrs, ids) => {
      expect(err).to.not.exist()

      const guy = dhts[0]
      const others = dhts.slice(1)
      const val = Buffer.from('foobar')

      series([
        (cb) => times(20, (i, cb) => {
          times(16, (j, cb) => {
            const t = 20 + random(79)
            connect(others[i], others[t], cb)
          }, cb)
        }, cb),
        (cb) => times(20, (i, cb) => {
          connect(guy, others[i], cb)
        }, cb),
        (cb) => kadUtils.convertBuffer(val, (err, rtval) => {
          expect(err).to.not.exist()
          const rtablePeers = guy.routingTable.closestPeers(rtval, c.ALPHA)
          expect(rtablePeers).to.have.length(3)

          const netPeers = guy.peerBook.getAllArray().filter((p) => p.isConnected())
          expect(netPeers).to.have.length(20)

          const rtableSet = {}
          rtablePeers.forEach((p) => {
            rtableSet[p.toB58String()] = true
          })

          series([
            (cb) => guy.getClosestPeers(val, cb),
            (cb) => kadUtils.sortClosestPeers(ids.slice(1), rtval, cb)
          ], (err, res) => {
            expect(err).to.not.exist()
            const out = res[0]
            const actualClosest = res[1]

            expect(out.filter((p) => !rtableSet[p.toB58String()]))
              .to.not.be.empty()

            expect(out).to.have.length(20)
            const exp = actualClosest.slice(0, 20)

            kadUtils.sortClosestPeers(out, rtval, (err, got) => {
              expect(err).to.not.exist()
              expect(countDiffPeers(exp, got)).to.eql(0)

              cb()
            })
          })
        })
      ], done)
    })
  })

  it('getClosestPeers', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 30
    setupDHTs(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      // ring connect
      series([
        (cb) => times(dhts.length, (i, cb) => {
          connect(dhts[i], dhts[(i + 1) % dhts.length], cb)
        }, cb),
        (cb) => dhts[1].getClosestPeers(new Buffer('foo'), cb)
      ], (err, res) => {
        expect(err).to.not.exist()
        expect(res[1]).to.have.length(c.K)
        done()
      })
    })
  })

  describe('getPublicKey', () => {
    it('already known', function (done) {
      this.timeout(20 * 1000)

      setupDHTs(2, (err, dhts, addrs, ids) => {
        expect(err).to.not.exist()
        dhts[0].peerBook.put(dhts[1].peerInfo)
        dhts[0].getPublicKey(ids[1], (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.be.eql(dhts[1].peerInfo.id.pubKey)
          done()
        })
      })
    })

    it('connected node', function (done) {
      this.timeout(40 * 1000)

      setupDHTs(2, (err, dhts, addrs, ids) => {
        expect(err).to.not.exist()

        waterfall([
          (cb) => connect(dhts[0], dhts[1], cb),
          (cb) => {
            // remove the pub key to be sure it is fetched
            const p = dhts[0].peerBook.get(ids[1])
            p.id._pubKey = null
            dhts[0].peerBook.put(p, true)
            dhts[0].getPublicKey(ids[1], cb)
          },
          (key, cb) => {
            expect(key.equals(dhts[1].peerInfo.id.pubKey)).to.eql(true)
            cb()
          }
        ], done)
      })
    })
  })

  it('_nearestPeersToQuery', (done) => {
    const swarm = new Swarm(peerInfos[0], new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.connection.addStreamMuxer(Multiplex)
    swarm.connection.reuse()
    const dht = new KadDHT(swarm)

    dht.peerBook.put(peerInfos[1])
    series([
      (cb) => dht._add(peerInfos[1], cb),
      (cb) => dht._nearestPeersToQuery({key: 'hello'}, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      expect(res[1]).to.be.eql([peerInfos[1]])
      done()
    })
  })

  it('_betterPeersToQuery', (done) => {
    const swarm = new Swarm(peerInfos[0], new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.connection.addStreamMuxer(Multiplex)
    swarm.connection.reuse()
    const dht = new KadDHT(swarm)

    dht.peerBook.put(peerInfos[1])
    dht.peerBook.put(peerInfos[2])

    series([
      (cb) => dht._add(peerInfos[1], cb),
      (cb) => dht._add(peerInfos[2], cb),
      (cb) => dht._betterPeersToQuery({key: 'hello'}, peerInfos[1], cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      expect(res[2]).to.be.eql([peerInfos[2]])
      done()
    })
  })

  describe('_verifyRecordLocally', () => {
    it('invalid record (missing public key)', (done) => {
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      const dht = new KadDHT(swarm)

      // Not putting the peer info into the peerbook
      // dht.peerBook.put(peerInfos[1])

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world'),
        peerInfos[1].id
      )

      waterfall([
        (cb) => record.serializeSigned(peerInfos[1].id.privKey, cb),
        (enc, cb) => dht._verifyRecordLocally(Record.deserialize(enc), (err) => {
          expect(err).to.match(/Missing public key/)
          cb()
        })
      ], done)
    })

    it('valid record - signed', (done) => {
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      const dht = new KadDHT(swarm)

      dht.peerBook.put(peerInfos[1])

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world'),
        peerInfos[1].id
      )

      waterfall([
        (cb) => record.serializeSigned(peerInfos[1].id.privKey, cb),
        (enc, cb) => dht._verifyRecordLocally(Record.deserialize(enc), cb)
      ], done)
    })

    it('valid record - not signed', (done) => {
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      const dht = new KadDHT(swarm)

      dht.peerBook.put(peerInfos[1])

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world'),
        peerInfos[1].id
      )

      waterfall([
        (cb) => cb(null, record.serialize()),
        (enc, cb) => dht._verifyRecordLocally(Record.deserialize(enc), cb)
      ], done)
    })
  })
})

function setupDHTs (n, callback) {
  times(n, (i, cb) => setupDHT(cb), (err, dhts) => {
    if (err) {
      return callback(err)
    }
    callback(null, dhts, dhts.map((d) => d.peerInfo.multiaddrs.toArray()[0]), dhts.map((d) => d.peerInfo.id))
  })
}

// connect two dhts
function connectNoSync (a, b, callback) {
  const target = _.cloneDeep(b.peerInfo)
  target.id._pubKey = target.id.pubKey
  target.id._privKey = null
  a.swarm.dial(target, callback)
}

function find (a, b, cb) {
  retry({ times: 50, interval: 100 }, (cb) => {
    a.routingTable.find(b.peerInfo.id, (err, match) => {
      if (err) {
        return cb(err)
      }
      if (!match) {
        return cb(new Error('not found'))
      }

      try {
        expect(a.peerBook.get(b.peerInfo).multiaddrs.toArray()[0].toString())
          .to.eql(b.peerInfo.multiaddrs.toArray()[0].toString())
      } catch (err) {
        return cb(err)
      }

      cb()
    })
  }, cb)
}

// connect two dhts and wait for them to have each other
// in their routing table
function connect (a, b, callback) {
  series([
    (cb) => connectNoSync(a, b, cb),
    (cb) => find(a, b, cb),
    (cb) => find(b, a, cb)
  ], (err) => callback(err))
}

function bootstrap (dhts) {
  dhts.forEach((dht) => {
    dht._bootstrap(3, 10000)
  })
}

function waitForWellFormedTables (dhts, minPeers, avgPeers, maxTimeout, callback) {
  timeout((cb) => {
    retry({ times: 50, interval: 200 }, (cb) => {
      let totalPeers = 0

      const ready = dhts.map((dht) => {
        const rtlen = dht.routingTable.size
        totalPeers += rtlen
        if (minPeers > 0 && rtlen < minPeers) {
          return false
        }
        const actualAvgPeers = totalPeers / dhts.length
        if (avgPeers > 0 && actualAvgPeers < avgPeers) {
          return false
        }
        return true
      })

      const done = ready.every(Boolean)
      cb(done ? null : new Error('not done yet'))
    }, cb)
  }, maxTimeout)(callback)
}

function countDiffPeers (a, b) {
  const s = new Set()
  a.forEach((p) => s.add(p.toB58String()))

  return b.filter((p) => !s.has(p.toB58String())).length
}
