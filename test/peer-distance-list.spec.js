/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerId = require('peer-id')
const series = require('async/series')

const kadUtils = require('../src/utils')
const PeerDistanceList = require('../src/peer-distance-list')

describe('PeerDistanceList', () => {
  const p1 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))
  const p2 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32'))
  const p3 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33'))
  const p4 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34'))
  const p5 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31'))
  const p6 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a35'))
  const p7 = new PeerId(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32'))

  let key
  before((done) => {
    kadUtils.convertPeerId(p1, (err, k) => {
      if (err) {
        return done(err)
      }

      key = k

      done()
    })
  })

  describe('basics', () => {
    it('add', (done) => {
      const pdl = new PeerDistanceList(key)

      series([
        (cb) => pdl.add(p3, cb),
        (cb) => pdl.add(p1, cb),
        (cb) => pdl.add(p2, cb),
        (cb) => pdl.add(p4, cb),
        (cb) => pdl.add(p5, cb),
        (cb) => pdl.add(p1, cb)
      ], (err) => {
        expect(err).to.not.exist()

        // Note: p1 and p5 are equal
        expect(pdl.length).to.eql(4)
        expect(pdl.peers).to.be.eql([p1, p4, p3, p2])

        done()
      })
    })

    it('capacity', (done) => {
      const pdl = new PeerDistanceList(key, 3)

      series([
        (cb) => pdl.add(p1, cb),
        (cb) => pdl.add(p2, cb),
        (cb) => pdl.add(p3, cb),
        (cb) => pdl.add(p4, cb),
        (cb) => pdl.add(p5, cb),
        (cb) => pdl.add(p6, cb)
      ], (err) => {
        expect(err).to.not.exist()

        // Note: p1 and p5 are equal
        expect(pdl.length).to.eql(3)

        // Closer peers added later should replace further
        // peers added earlier
        expect(pdl.peers).to.be.eql([p1, p6, p4])

        done()
      })
    })
  })

  describe('closer', () => {
    let pdl
    before((done) => {
      pdl = new PeerDistanceList(key)
      series([
        (cb) => pdl.add(p1, cb),
        (cb) => pdl.add(p2, cb),
        (cb) => pdl.add(p3, cb),
        (cb) => pdl.add(p4, cb)
      ], done)
    })

    it('single closer peer', (done) => {
      pdl.anyCloser([p6], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(true)
        done()
      })
    })

    it('single further peer', (done) => {
      pdl.anyCloser([p7], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(false)
        done()
      })
    })

    it('closer and further peer', (done) => {
      pdl.anyCloser([p6, p7], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(true)
        done()
      })
    })

    it('single peer equal to furthest in list', (done) => {
      pdl.anyCloser([p2], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(false)
        done()
      })
    })

    it('no peers', (done) => {
      pdl.anyCloser([], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(false)
        done()
      })
    })

    it('empty peer distance list', (done) => {
      new PeerDistanceList(key).anyCloser([p1], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(true)
        done()
      })
    })

    it('empty peer distance list and no peers', (done) => {
      new PeerDistanceList(key).anyCloser([], (err, closer) => {
        expect(err).to.not.exist()
        expect(closer).to.be.eql(false)
        done()
      })
    })
  })
})
