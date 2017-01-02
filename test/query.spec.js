/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Libp2p = require('libp2p-ipfs-nodejs')

const DHT = require('../src')
const Query = require('../src/query')

const makePeers = require('./util').makePeers

describe('Query', () => {
  let infos
  let libp2p
  let dht

  before((done) => {
    makePeers(3, (err, peers) => {
      if (err) {
        return done(err)
      }

      infos = peers
      libp2p = new Libp2p(infos[0])
      dht = new DHT(libp2p)

      done()
    })
  })

  it('simple run', (done) => {
    const peer = infos[0]

    // mock this so we can dial non existing peers
    libp2p.dial = (peer, callback) => {
      callback()
    }

    let i = 0
    const query = (p, cb) => {
      if (i++ === 1) {
        expect(p.id).to.eql(infos[2].id.id)

        return cb(null, {
          value: new Buffer('cool'),
          success: true
        })
      }
      expect(p.id).to.eql(infos[1].id.id)
      cb(null, {
        closerPeers: [infos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, query)
    q.run([infos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.value).to.eql(new Buffer('cool'))
      expect(res.success).to.eql(true)
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  it('returns an error if all queries error', (done) => {
    const peer = infos[0]

    // mock this so we can dial non existing peers
    libp2p.dial = (peer, callback) => {
      callback()
    }

    const query = (p, cb) => {
      cb(new Error('fail'))
    }

    const q = new Query(dht, peer.id.id, query)
    q.run([infos[1].id], (err, res) => {
      expect(err).to.exist()
      expect(err.message).to.eql('fail')
      done()
    })
  })

  it('only closerPeers', (done) => {
    const peer = infos[0]

    // mock this so we can dial non existing peers
    libp2p.dial = (peer, callback) => {
      callback()
    }

    const query = (p, cb) => {
      cb(null, {
        closerPeers: [infos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, query)
    q.run([infos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })
})
