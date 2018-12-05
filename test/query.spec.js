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
const createDisjointTracks = require('./utils/create-disjoint-tracks')

describe('Query', () => {
  let peerInfos
  let dht

  before(function (done) {
    this.timeout(5 * 1000)
    createPeerInfo(10, (err, result) => {
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

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.paths[0].value).to.eql(Buffer.from('cool'))
      expect(res.paths[0].success).to.eql(true)
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  it('returns an error if all queries error', (done) => {
    const peer = peerInfos[0]

    // mock this so we can dial non existing peers
    dht.switch.dial = (peer, callback) => callback()

    const query = (p, cb) => cb(new Error('fail'))

    const q = new Query(dht, peer.id.id, () => query)
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

    const q = new Query(dht, peer.id.id, () => query)
    q.run([peerInfos[1].id], (err, res) => {
      expect(err).to.not.exist()
      expect(res.finalSet.size).to.eql(2)
      done()
    })
  })

  /*
   * This test creates two disjoint tracks of peers, one for
   * each of the query's two paths to follow. The "good"
   * track that leads to the target initially has high
   * distances to the target, while the "bad" track that
   * goes nowhere has small distances to the target.
   * Only by going down both simultaneously will it find
   * the target before the end of the bad track. The greedy
   * behavior without disjoint paths would reach the target
   * only after visiting every single peer.
   *
   *                 xor distance to target
   * far <-----------------------------------------------> close
   * <us>
   *     <good 0> <g 1> <g 2>                            <target>
   *                           <bad 0> <b 1> ... <b n>
   *
   */
  it('uses disjoint paths', (done) => {
    const goodLength = 3
    createDisjointTracks(peerInfos, goodLength, (err, targetId, starts, getResponse) => {
      expect(err).to.not.exist()
      // mock this so we can dial non existing peers
      dht.switch.dial = (peer, callback) => callback()
      let badEndVisited = false

      const q = new Query(dht, targetId, (trackNum) => {
        return (p, cb) => {
          const response = getResponse(p, trackNum)
          expect(response).to.exist() // or we aren't on the right track
          if (response.end && !response.success) {
            badEndVisited = true
          }
          if (response.success) {
            expect(badEndVisited).to.eql(false)
          }
          cb(null, response)
        }
      })
      q.concurrency = 1
      // due to round-robin allocation of peers from starts, first
      // path is good, second bad
      q.run(starts, (err, res) => {
        expect(err).to.not.exist()
        // we should visit all nodes (except the target)
        expect(res.finalSet.size).to.eql(peerInfos.length - 1)
        // there should be one successful path
        expect(res.paths.length).to.eql(1)
        done()
      })
    })
  })
})
