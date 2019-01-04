/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const sinon = require('sinon')
const series = require('async/series')
const times = require('async/times')
const parallel = require('async/parallel')
const timeout = require('async/timeout')
const retry = require('async/retry')
const each = require('async/each')
const waterfall = require('async/waterfall')
const random = require('lodash.random')
const Record = require('libp2p-record').Record
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')

const errcode = require('err-code')

const KadDHT = require('../src')
const kadUtils = require('../src/utils')
const c = require('../src/constants')

const createPeerInfo = require('./utils/create-peer-info')
const createValues = require('./utils/create-values')
const TestDHT = require('./utils/test-dht')

// connect two dhts
function connectNoSync (a, b, callback) {
  const publicPeerId = new PeerId(b.peerInfo.id.id, null, b.peerInfo.id.pubKey)
  const target = new PeerInfo(publicPeerId)
  target.multiaddrs = b.peerInfo.multiaddrs
  a.switch.dial(target, callback)
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
    // dht.randomWalk._walk(3, 10000, () => {}) // don't need to know when it finishes
    dht.randomWalk.start(1, 1000) // don't need to know when it finishes
  })
}

function waitForWellFormedTables (dhts, minPeers, avgPeers, waitTimeout, callback) {
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
  }, waitTimeout)(callback)
}

function countDiffPeers (a, b) {
  const s = new Set()
  a.forEach((p) => s.add(p.toB58String()))

  return b.filter((p) => !s.has(p.toB58String())).length
}

describe('KadDHT', () => {
  let peerInfos
  let values

  before(function (done) {
    this.timeout(10 * 1000)

    parallel([
      (cb) => createPeerInfo(3, cb),
      (cb) => createValues(20, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      peerInfos = res[0]
      values = res[1]
      done()
    })
  })

  it('create', () => {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw, { kBucketSize: 5 })

    expect(dht).to.have.property('peerInfo').eql(peerInfos[0])
    expect(dht).to.have.property('switch').eql(sw)
    expect(dht).to.have.property('kBucketSize', 5)
    expect(dht).to.have.property('routingTable')
  })

  it('create with validators and selectors', () => {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw, {
      validators: {
        ipns: {
          func: (key, record, cb) => cb()
        }
      },
      selectors: {
        ipns: (key, records) => 0
      }
    })

    expect(dht).to.have.property('peerInfo').eql(peerInfos[0])
    expect(dht).to.have.property('switch').eql(sw)
    expect(dht).to.have.property('routingTable')
    expect(dht.validators).to.have.property('ipns')
    expect(dht.selectors).to.have.property('ipns')
  })

  it('should be able to start and stop', function (done) {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw)

    sinon.spy(dht.network, 'start')
    sinon.spy(dht.randomWalk, 'start')

    sinon.spy(dht.network, 'stop')
    sinon.spy(dht.randomWalk, 'stop')

    series([
      (cb) => dht.start(cb),
      (cb) => {
        expect(dht.network.start.calledOnce).to.equal(true)
        expect(dht.randomWalk.start.calledOnce).to.equal(true)

        cb()
      },
      (cb) => dht.stop(cb)
    ], (err) => {
      expect(err).to.not.exist()
      expect(dht.network.stop.calledOnce).to.equal(true)
      expect(dht.randomWalk.stop.calledOnce).to.equal(true)

      done()
    })
  })

  it('should be able to start with random-walk disabled', function (done) {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw, { enabledDiscovery: false })

    sinon.spy(dht.network, 'start')
    sinon.spy(dht.randomWalk, 'start')

    sinon.spy(dht.network, 'stop')
    sinon.spy(dht.randomWalk, 'stop')

    series([
      (cb) => dht.start(cb),
      (cb) => {
        expect(dht.network.start.calledOnce).to.equal(true)
        expect(dht.randomWalk.start.calledOnce).to.equal(false)

        cb()
      },
      (cb) => dht.stop(cb)
    ], (err) => {
      expect(err).to.not.exist()
      expect(dht.network.stop.calledOnce).to.equal(true)
      expect(dht.randomWalk.stop.calledOnce).to.equal(true) // Should be always disabled, as it can be started using the instance

      done()
    })
  })

  it('should fail to start when already started', function (done) {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw, { enabledDiscovery: false })

    series([
      (cb) => dht.start(cb),
      (cb) => dht.start(cb)
    ], (err) => {
      expect(err).to.exist()
      done()
    })
  })

  it('should fail to stop when was not started', function (done) {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw, { enabledDiscovery: false })

    series([
      (cb) => dht.stop(cb)
    ], (err) => {
      expect(err).to.exist()
      done()
    })
  })

  it('put - get', function (done) {
    this.timeout(10 * 1000)
    const tdht = new TestDHT()

    tdht.spawn(2, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      waterfall([
        (cb) => connect(dhtA, dhtB, cb),
        (cb) => dhtA.put(Buffer.from('/v/hello'), Buffer.from('world'), cb),
        (cb) => dhtB.get(Buffer.from('/v/hello'), { timeout: 1000 }, cb),
        (res, cb) => {
          expect(res).to.eql(Buffer.from('world'))
          cb()
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('put - get using key with no prefix (no selector available)', function (done) {
    this.timeout(10 * 1000)
    const tdht = new TestDHT()

    tdht.spawn(2, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      waterfall([
        (cb) => connect(dhtA, dhtB, cb),
        (cb) => dhtA.put(Buffer.from('hello'), Buffer.from('world'), cb),
        (cb) => dhtB.get(Buffer.from('hello'), { timeout: 1000 }, cb),
        (res, cb) => {
          expect(res).to.eql(Buffer.from('world'))
          cb()
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('put - get using key from provided validator and selector', function (done) {
    this.timeout(10 * 1000)
    const tdht = new TestDHT()

    tdht.spawn(2, {
      validators: {
        ipns: {
          func: (key, record, cb) => cb()
        }
      },
      selectors: {
        ipns: (key, records) => 0
      }
    }, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      waterfall([
        (cb) => connect(dhtA, dhtB, cb),
        (cb) => dhtA.put(Buffer.from('/ipns/hello'), Buffer.from('world'), cb),
        (cb) => dhtB.get(Buffer.from('/ipns/hello'), { timeout: 1000 }, cb),
        (res, cb) => {
          expect(res).to.eql(Buffer.from('world'))
          cb()
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('put - get should fail if unrecognized key prefix in get', function (done) {
    this.timeout(10 * 1000)
    const tdht = new TestDHT()

    tdht.spawn(2, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      waterfall([
        (cb) => connect(dhtA, dhtB, cb),
        (cb) => dhtA.put(Buffer.from('/v2/hello'), Buffer.from('world'), cb),
        (cb) => dhtB.get(Buffer.from('/v2/hello'), { timeout: 1000 }, cb)
      ], (err) => {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_UNRECOGNIZED_KEY_PREFIX')
        tdht.teardown(done)
      })
    })
  })

  it('put - get with update', function (done) {
    this.timeout(20 * 1000)
    const tdht = new TestDHT()

    tdht.spawn(2, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      const dhtASpy = sinon.spy(dhtA, '_putValueToPeer')

      series([
        (cb) => dhtA.put(Buffer.from('/v/hello'), Buffer.from('worldA'), cb),
        (cb) => dhtB.put(Buffer.from('/v/hello'), Buffer.from('worldB'), cb),
        (cb) => connect(dhtA, dhtB, cb)
      ], (err) => {
        expect(err).to.not.exist()

        series([
          (cb) => dhtA.get(Buffer.from('/v/hello'), { timeout: 1000 }, cb),
          (cb) => dhtB.get(Buffer.from('/v/hello'), { timeout: 1000 }, cb)
        ], (err, results) => {
          expect(err).to.not.exist()
          results.forEach((res) => {
            expect(res).to.eql(Buffer.from('worldA')) // first is selected
          })
          expect(dhtASpy.callCount).to.eql(1)
          expect(dhtASpy.getCall(0).args[2].isEqual(dhtB.peerInfo.id)).to.eql(true) // inform B
          tdht.teardown(done)
        })
      })
    })
  })

  it('provides', function (done) {
    this.timeout(20 * 1000)

    const tdht = new TestDHT()

    tdht.spawn(4, (err, dhts) => {
      expect(err).to.not.exist()
      const addrs = dhts.map((d) => d.peerInfo.multiaddrs.toArray()[0])
      const ids = dhts.map((d) => d.peerInfo.id)

      series([
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
            dhts[n].findProviders(v.cid, { timeout: 5000 }, (err, provs) => {
              expect(err).to.not.exist()
              expect(provs).to.have.length(1)
              expect(provs[0].id.id).to.be.eql(ids[3].id)
              expect(
                provs[0].multiaddrs.toArray()[0].toString()
              ).to.equal(
                addrs[3].toString()
              )
              cb()
            })
          }, cb)
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('find providers', function (done) {
    this.timeout(20 * 1000)

    const val = values[0]
    const tdht = new TestDHT()

    tdht.spawn(3, (err, dhts) => {
      expect(err).to.not.exist()

      series([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => each(dhts, (dht, cb) => dht.provide(val.cid, cb), cb),
        (cb) => dhts[0].findProviders(val.cid, {}, cb),
        (cb) => dhts[0].findProviders(val.cid, { maxNumProviders: 2 }, cb)
      ], (err, res) => {
        expect(err).to.not.exist()

        // find providers find all the 3 providers
        expect(res[3]).to.exist()
        expect(res[3]).to.have.length(3)

        // find providers limited to a maxium of 2 providers
        expect(res[4]).to.exist()
        expect(res[4]).to.have.length(2)

        done()
      })
    })
  })

  it('random-walk', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 20
    const tdht = new TestDHT()

    // random walk disabled for a manual usage
    tdht.spawn(nDHTs, { enabledDiscovery: false }, (err, dhts) => {
      expect(err).to.not.exist()

      series([
        // ring connect
        (cb) => times(nDHTs, (i, cb) => {
          connect(dhts[i], dhts[(i + 1) % nDHTs], cb)
        }, (err) => cb(err)),
        (cb) => {
          bootstrap(dhts)
          waitForWellFormedTables(dhts, 7, 0, 20 * 1000, cb)
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('layered get', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 4
    const tdht = new TestDHT()

    tdht.spawn(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      waterfall([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => connect(dhts[2], dhts[3], cb),
        (cb) => dhts[3].put(
          Buffer.from('/v/hello'),
          Buffer.from('world'),
          cb
        ),
        (cb) => dhts[0].get(Buffer.from('/v/hello'), { timeout: 1000 }, cb),
        (res, cb) => {
          expect(res).to.eql(Buffer.from('world'))
          cb()
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('findPeer', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 4
    const tdht = new TestDHT()

    tdht.spawn(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      const ids = dhts.map((d) => d.peerInfo.id)

      waterfall([
        (cb) => connect(dhts[0], dhts[1], cb),
        (cb) => connect(dhts[1], dhts[2], cb),
        (cb) => connect(dhts[2], dhts[3], cb),
        (cb) => dhts[0].findPeer(ids[3], { timeout: 1000 }, cb),
        (res, cb) => {
          expect(res.id.isEqual(ids[3])).to.eql(true)
          cb()
        }
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('connect by id to with address in the peerbook ', function (done) {
    this.timeout(20 * 1000)

    const nDHTs = 2
    const tdht = new TestDHT()

    tdht.spawn(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()
      const dhtA = dhts[0]
      const dhtB = dhts[1]

      const peerA = dhtA.peerInfo
      const peerB = dhtB.peerInfo
      dhtA.peerBook.put(peerB)
      dhtB.peerBook.put(peerA)

      parallel([
        (cb) => dhtA.switch.dial(peerB.id, cb),
        (cb) => dhtB.switch.dial(peerA.id, cb)
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('find peer query', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 101
    const tdht = new TestDHT()

    tdht.spawn(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      const ids = dhts.map((d) => d.peerInfo.id)

      const guy = dhts[0]
      const others = dhts.slice(1)
      const val = Buffer.from('foobar')
      const connected = {} // indexes in others that are reachable from guy

      series([
        (cb) => times(20, (i, cb) => {
          times(16, (j, cb) => {
            const t = 20 + random(79)
            connected[t] = true
            connect(others[i], others[t], cb)
          }, cb)
        }, cb),
        (cb) => times(20, (i, cb) => {
          connected[i] = true
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

          const connectedIds = ids.slice(1).filter((id, i) => connected[i])

          series([
            (cb) => guy.getClosestPeers(val, cb),
            (cb) => kadUtils.sortClosestPeers(connectedIds, rtval, cb)
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
      ], (err) => {
        expect(err).to.not.exist()
        tdht.teardown(done)
      })
    })
  })

  it('getClosestPeers', function (done) {
    this.timeout(40 * 1000)

    const nDHTs = 30
    const tdht = new TestDHT()

    tdht.spawn(nDHTs, (err, dhts) => {
      expect(err).to.not.exist()

      // ring connect
      series([
        (cb) => times(dhts.length, (i, cb) => {
          connect(dhts[i], dhts[(i + 1) % dhts.length], cb)
        }, cb),
        (cb) => dhts[1].getClosestPeers(Buffer.from('foo'), cb)
      ], (err, res) => {
        expect(err).to.not.exist()
        expect(res[1]).to.have.length(c.K)
        tdht.teardown(done)
      })
    })
  })

  describe('getPublicKey', () => {
    it('already known', function (done) {
      this.timeout(20 * 1000)

      const nDHTs = 2
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        const ids = dhts.map((d) => d.peerInfo.id)

        dhts[0].peerBook.put(dhts[1].peerInfo)
        dhts[0].getPublicKey(ids[1], (err, key) => {
          expect(err).to.not.exist()
          expect(key).to.eql(dhts[1].peerInfo.id.pubKey)
          tdht.teardown(done)
        })
      })
    })

    it('connected node', function (done) {
      this.timeout(30 * 1000)

      const nDHTs = 2
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        const ids = dhts.map((d) => d.peerInfo.id)

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
        ], (err) => {
          expect(err).to.not.exist()
          tdht.teardown(done)
        })
      })
    })
  })

  it('_nearestPeersToQuery', (done) => {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw)

    dht.peerBook.put(peerInfos[1])
    series([
      (cb) => dht._add(peerInfos[1], cb),
      (cb) => dht._nearestPeersToQuery({ key: 'hello' }, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      expect(res[1]).to.be.eql([peerInfos[1]])
      done()
    })
  })

  it('_betterPeersToQuery', (done) => {
    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    const dht = new KadDHT(sw)

    dht.peerBook.put(peerInfos[1])
    dht.peerBook.put(peerInfos[2])

    series([
      (cb) => dht._add(peerInfos[1], cb),
      (cb) => dht._add(peerInfos[2], cb),
      (cb) => dht._betterPeersToQuery({ key: 'hello' }, peerInfos[1], cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      expect(res[2]).to.be.eql([peerInfos[2]])
      done()
    })
  })

  describe('_checkLocalDatastore', () => {
    it('allow a peer record from store if recent', (done) => {
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      const dht = new KadDHT(sw)

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world')
      )
      record.timeReceived = new Date()

      waterfall([
        (cb) => dht._putLocal(record.key, record.serialize(), cb),
        (cb) => dht._checkLocalDatastore(record.key, cb)
      ], (err, rec) => {
        expect(err).to.not.exist()
        expect(rec).to.exist('Record should not have expired')
        expect(rec.value.toString()).to.equal(record.value.toString())
        done()
      })
    })
    it('delete entries received from peers that have expired', (done) => {
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      const dht = new KadDHT(sw)

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world')
      )
      let received = new Date()
      received.setDate(received.getDate() - 2)

      record.timeReceived = received

      waterfall([
        (cb) => dht._putLocal(record.key, record.serialize(), cb),
        (cb) => dht.datastore.get(kadUtils.bufferToKey(record.key), cb),
        (lookup, cb) => {
          expect(lookup).to.exist('Record should be in the local datastore')
          cb()
        },
        (cb) => dht._checkLocalDatastore(record.key, cb)
      ], (err, rec) => {
        expect(err).to.not.exist()
        expect(rec).to.not.exist('Record should have expired')

        dht.datastore.get(kadUtils.bufferToKey(record.key), (err, lookup) => {
          expect(err).to.exist('Should throw error for not existing')
          expect(lookup).to.not.exist('Record should be removed from datastore')
          done()
        })
      })
    })
  })

  describe('_verifyRecordLocally', () => {
    it('valid record', (done) => {
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      const dht = new KadDHT(sw)

      dht.peerBook.put(peerInfos[1])

      const record = new Record(
        Buffer.from('hello'),
        Buffer.from('world')
      )

      waterfall([
        (cb) => cb(null, record.serialize()),
        (enc, cb) => dht._verifyRecordLocally(Record.deserialize(enc), cb)
      ], done)
    })
  })

  describe('errors', () => {
    it('get many should fail if only has one peer', function (done) {
      this.timeout(20 * 1000)

      const nDHTs = 1
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        dhts[0].getMany('/v/hello', 5, (err) => {
          expect(err).to.exist()
          expect(err.code).to.be.eql('ERR_NO_PEERS_IN_ROUTING_TABLE')
          tdht.teardown(done)
        })
      })
    })

    it('get should handle correctly an unexpected error', function (done) {
      this.timeout(20 * 1000)

      const errCode = 'ERR_INVALID_RECORD_FAKE'
      const error = errcode(new Error('fake error'), errCode)

      const nDHTs = 2
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        const dhtA = dhts[0]
        const dhtB = dhts[1]
        const stub = sinon.stub(dhtA, '_getValueOrPeers').callsArgWithAsync(2, error)

        waterfall([
          (cb) => connect(dhtA, dhtB, cb),
          (cb) => dhtA.get(Buffer.from('/v/hello'), { timeout: 1000 }, cb)
        ], (err) => {
          expect(err).to.exist()
          expect(err.code).to.be.eql(errCode)

          stub.restore()
          tdht.teardown(done)
        })
      })
    })

    it('get should handle correctly an invalid record error and return not found', function (done) {
      this.timeout(20 * 1000)

      const error = errcode(new Error('invalid record error'), 'ERR_INVALID_RECORD')

      const nDHTs = 2
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        const dhtA = dhts[0]
        const dhtB = dhts[1]
        const stub = sinon.stub(dhtA, '_getValueOrPeers').callsArgWithAsync(2, error)

        waterfall([
          (cb) => connect(dhtA, dhtB, cb),
          (cb) => dhtA.get(Buffer.from('/v/hello'), cb)
        ], (err) => {
          expect(err).to.exist()
          expect(err.code).to.be.eql('ERR_NOT_FOUND')

          stub.restore()
          tdht.teardown(done)
        })
      })
    })

    it('findPeer should fail if no closest peers available', function (done) {
      this.timeout(40 * 1000)

      const nDHTs = 4
      const tdht = new TestDHT()

      tdht.spawn(nDHTs, (err, dhts) => {
        expect(err).to.not.exist()

        const ids = dhts.map((d) => d.peerInfo.id)

        waterfall([
          (cb) => connect(dhts[0], dhts[1], cb),
          (cb) => connect(dhts[1], dhts[2], cb),
          (cb) => connect(dhts[2], dhts[3], cb)
        ], (err) => {
          expect(err).to.not.exist()
          const stub = sinon.stub(dhts[0].routingTable, 'closestPeers').returns([])

          dhts[0].findPeer(ids[3], { timeout: 1000 }, (err) => {
            expect(err).to.exist()
            expect(err.code).to.eql('ERR_LOOKUP_FAILED')
            stub.restore()
            tdht.teardown(done)
          })
        })
      })
    })
  })
})
