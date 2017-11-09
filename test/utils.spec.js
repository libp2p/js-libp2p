/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const base32 = require('base32.js')
const PeerId = require('peer-id')
const distance = require('xor-distance')
const waterfall = require('async/waterfall')

const utils = require('../src/utils')
const makePeers = require('./utils').makePeers

describe('utils', () => {
  describe('bufferToKey', () => {
    it('returns the base32 encoded key of the buffer', () => {
      const buf = Buffer.from('hello world')

      const key = utils.bufferToKey(buf)

      const enc = new base32.Encoder()
      expect(
        key.toString()
      ).to.be.eql(
        '/' + enc.write(buf).finalize()
      )
    })
  })

  describe('convertBuffer', () => {
    it('returns the sha2-256 hash of the buffer', (done) => {
      const buf = Buffer.from('hello world')

      utils.convertBuffer(buf, (err, digest) => {
        expect(err).to.not.exist()

        expect(digest)
          .to.eql(Buffer.from('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'hex'))
        done()
      })
    })
  })

  describe('sortClosestPeers', () => {
    it('sorts a list of PeerInfos', (done) => {
      const rawIds = [
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34'
      ]

      const ids = rawIds.map((raw) => {
        return new PeerId(Buffer.from(raw))
      })

      const input = [
        ids[2],
        ids[1],
        ids[3],
        ids[0]
      ]

      waterfall([
        (cb) => utils.convertPeerId(ids[0], cb),
        (id, cb) => utils.sortClosestPeers(input, id, cb),
        (out, cb) => {
          expect(
            out.map((m) => m.toB58String())
          ).to.be.eql([
            ids[0],
            ids[3],
            ids[2],
            ids[1]
          ].map((m) => m.toB58String()))
          done()
        }
      ], done)
    })
  })

  describe('xorCompare', () => {
    it('sorts two distances', () => {
      const target = Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a90')
      const a = {
        distance: distance(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a95'), target)
      }
      const b = {
        distance: distance(Buffer.from('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a96'), target)
      }

      expect(utils.xorCompare(a, b)).to.eql(-1)
      expect(utils.xorCompare(b, a)).to.eql(1)
      expect(utils.xorCompare(a, a)).to.eql(0)
    })
  })

  describe('keyForPublicKey', () => {
    it('works', (done) => {
      makePeers(1, (err, peers) => {
        expect(err).to.not.exist()

        expect(utils.keyForPublicKey(peers[0].id))
          .to.eql(Buffer.concat([Buffer.from('/pk/'), peers[0].id.id]))
        done()
      })
    })
  })

  describe('fromPublicKeyKey', () => {
    it('round trips', function (done) {
      this.timeout(40 * 1000)

      makePeers(50, (err, peers) => {
        expect(err).to.not.exist()

        peers.forEach((p, i) => {
          const id = p.id
          expect(utils.isPublicKeyKey(utils.keyForPublicKey(id))).to.eql(true)
          expect(utils.fromPublicKeyKey(utils.keyForPublicKey(id)).id)
            .to.eql(id.id)
        })
        done()
      })
    })
  })
})
