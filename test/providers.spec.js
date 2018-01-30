/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Store = require('interface-datastore').MemoryDatastore
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const CID = require('cids')
const multihashing = require('multihashing-async')
const map = require('async/map')
const timesSeries = require('async/timesSeries')
const each = require('async/each')
const eachSeries = require('async/eachSeries')
const range = require('lodash.range')
const LevelStore = require('datastore-level')
const path = require('path')
const os = require('os')
const Buffer = require('safe-buffer').Buffer

const Providers = require('../src/providers')

const util = require('./utils')

describe('Providers', () => {
  let infos

  before(function (done) {
    this.timeout(10 * 1000)
    util.makePeers(3, (err, peers) => {
      if (err) {
        return done(err)
      }

      infos = peers
      done()
    })
  })

  it('simple add and get of providers', (done) => {
    const providers = new Providers(new Store(), infos[2].id)

    const cid = new CID('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    parallel([
      (cb) => providers.addProvider(cid, infos[0].id, cb),
      (cb) => providers.addProvider(cid, infos[1].id, cb)
    ], (err) => {
      expect(err).to.not.exist()
      providers.getProviders(cid, (err, provs) => {
        expect(err).to.not.exist()
        expect(provs).to.be.eql([infos[0].id, infos[1].id])
        providers.stop()

        done()
      })
    })
  })

  it('more providers than space in the lru cache', (done) => {
    const providers = new Providers(new Store(), infos[2].id, 10)

    waterfall([
      (cb) => map(
        range(100),
        (i, cb) => multihashing(Buffer.from(`hello ${i}`), 'sha2-256', cb),
        cb
      ),
      (hashes, cb) => {
        const cids = hashes.map((h) => new CID(h))

        map(cids, (cid, cb) => {
          providers.addProvider(cid, infos[0].id, cb)
        }, (err) => cb(err, cids))
      },
      (cids, cb) => {
        map(cids, (cid, cb) => {
          providers.getProviders(cid, cb)
        }, (err, provs) => {
          expect(err).to.not.exist()
          expect(provs).to.have.length(100)
          provs.forEach((p) => {
            expect(p[0].id).to.be.eql(infos[0].id.id)
          })
          providers.stop()
          cb()
        })
      }
    ], done)
  })

  it('expires', (done) => {
    const providers = new Providers(new Store(), infos[2].id)
    providers.cleanupInterval = 100
    providers.provideValidity = 200

    const cid = new CID('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    parallel([
      (cb) => providers.addProvider(cid, infos[0].id, cb),
      (cb) => providers.addProvider(cid, infos[1].id, cb)
    ], (err) => {
      expect(err).to.not.exist()

      providers.getProviders(cid, (err, provs) => {
        expect(err).to.not.exist()
        expect(provs).to.have.length(2)
        expect(provs[0].id).to.be.eql(infos[0].id.id)
        expect(provs[1].id).to.be.eql(infos[1].id.id)
      })

      setTimeout(() => {
        providers.getProviders(cid, (err, provs) => {
          expect(err).to.not.exist()
          expect(provs).to.have.length(0)
          providers.stop()
          done()
        })
      }, 300)
    })
  })

  // slooow so only run when you need to
  it.skip('many', (done) => {
    const p = path.join(
      os.tmpdir(), (Math.random() * 100).toString()
    )
    const store = new LevelStore(p)
    const providers = new Providers(store, infos[2].id, 10)

    console.log('starting')
    waterfall([
      (cb) => parallel([
        (cb) => util.makeValues(100, cb),
        (cb) => util.makePeers(600, cb)
      ], cb),
      (res, cb) => {
        console.log('got values and peers')
        const values = res[0]
        const peers = res[1]
        let total = Date.now()
        eachSeries(values, (v, cb) => {
          eachSeries(peers, (p, cb) => {
            providers.addProvider(v.cid, p.id, cb)
          }, cb)
        }, (err) => {
          console.log('addProvider %s peers %s cids in %sms', peers.length, values.length, Date.now() - total)
          expect(err).to.not.exist()
          console.log('starting profile with %s peers and %s cids', peers.length, values.length)
          timesSeries(3, (i, cb) => {
            const start = Date.now()
            each(values, (v, cb) => {
              providers.getProviders(v.cid, cb)
            }, (err) => {
              expect(err).to.not.exist()
              console.log('query %sms', (Date.now() - start))
              cb()
            })
          }, cb)
        })
      }
    ], (err) => {
      expect(err).to.not.exist()
      store.close(done)
    })
  })
})
