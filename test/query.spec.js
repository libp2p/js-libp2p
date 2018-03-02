/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')

const DHT = require('../src')
const Query = require('../src/query')

const createPeerInfo = require('./utils/create-peer-info')

describe('Query', () => {
  let peerInfos
  let dht

  before(function (done) {
    this.timeout(5 * 1000)
    createPeerInfo(3, (err, result) => {
      if (err) {
        return done(err)
      }

      peerInfos = result
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      dht = new DHT(sw)

      done()
    })
  })

  it('simple run', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

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
    dht.switch.dial = (peer, callback) => callback()

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
    dht.switch.dial = (peer, callback) => callback()

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
