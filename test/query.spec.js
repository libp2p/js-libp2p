/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Buffer = require('safe-buffer').Buffer
const PeerBook = require('peer-book')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')

const DHT = require('../src')
const Query = require('../src/query')

const makePeers = require('./utils').makePeers

describe('Query', () => {
  let peerInfos
  let dht

  before(function (done) {
    this.timeout(5 * 1000)
    makePeers(3, (err, result) => {
      if (err) {
        return done(err)
      }

      peerInfos = result
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      dht = new DHT(swarm)

      done()
    })
  })

  it('simple run', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.swarm.dial = (peer, callback) => callback()

    let i = 0
    const query = (p, cb) => {
      if (i++ === 1) {
        expect(p.id).to.eql(peerInfos[2].id.id)

        return cb(null, {
          value: Buffer.from('cool'),
          success: true
        })
      }
      expect(p.id).to.eql(peerInfos[1].id.id)
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.value).to.eql(Buffer.from('cool'))
      expect(res.success).to.eql(true)
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  it('returns an error if all queries error', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.swarm.dial = (peer, callback) => callback()

    const query = (p, cb) => cb(new Error('fail'))

    const q = new Query(dht, peer.id.id, query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.exist()
      expect(err.message).to.eql('fail')
      done()
    })
  })

  it('only closerPeers', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.swarm.dial = (peer, callback) => callback()

    const query = (p, cb) => {
      cb(null, {
        closerPeers: [peerInfos[2]]
      })
    }

    const q = new Query(dht, peer.id.id, query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })
})
