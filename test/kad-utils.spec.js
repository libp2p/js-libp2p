/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const { xor: uint8ArrayXor } = require('uint8arrays/xor')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const utils = require('../src/utils')
const createPeerId = require('./utils/create-peer-id')

describe('kad utils', () => {
  describe('bufferToKey', () => {
    it('returns the base32 encoded key of the buffer', () => {
      const buf = uint8ArrayFromString('hello world')

      const key = utils.bufferToKey(buf)

      expect(key.toString())
        .to.equal('/' + uint8ArrayToString(buf, 'base32'))
    })
  })

  describe('convertBuffer', () => {
    it('returns the sha2-256 hash of the buffer', async () => {
      const buf = uint8ArrayFromString('hello world')
      const digest = await utils.convertBuffer(buf)

      expect(digest)
        .to.equalBytes(uint8ArrayFromString('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'base16'))
    })
  })

  describe('withTimeout', () => {
    it('rejects with the error in the original function', async () => {
      const original = async () => { throw new Error('explode') } // eslint-disable-line require-await
      const asyncFn = utils.withTimeout(original, 100)
      let err
      try {
        await asyncFn()
      } catch (_err) {
        err = _err
      }

      expect(err).to.exist()
      expect(err.message).to.include('explode')
    })
  })

  describe('sortClosestPeers', () => {
    it('sorts a list of PeerIds', async () => {
      const rawIds = [
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33',
        '11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34'
      ]

      const ids = rawIds.map((raw) => {
        return new PeerId(uint8ArrayFromString(raw))
      })

      const input = [
        ids[2],
        ids[1],
        ids[3],
        ids[0]
      ]

      const id = await utils.convertPeerId(ids[0])
      const out = await utils.sortClosestPeers(input, id)

      expect(
        out.map((m) => m.toB58String())
      ).to.eql([
        ids[0],
        ids[3],
        ids[2],
        ids[1]
      ].map((m) => m.toB58String()))
    })
  })

  describe('xorCompare', () => {
    it('sorts two distances', () => {
      const target = uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a90')
      const a = {
        distance: uint8ArrayXor(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a95'), target)
      }
      const b = {
        distance: uint8ArrayXor(uint8ArrayFromString('11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a96'), target)
      }

      expect(utils.xorCompare(a, b)).to.eql(-1)
      expect(utils.xorCompare(b, a)).to.eql(1)
      expect(utils.xorCompare(a, a)).to.eql(0)
    })
  })

  describe('keyForPublicKey', () => {
    it('works', async () => {
      const peers = await createPeerId(1)
      expect(utils.keyForPublicKey(peers[0]))
        .to.eql(uint8ArrayConcat([uint8ArrayFromString('/pk/'), peers[0].id]))
    })
  })

  describe('fromPublicKeyKey', () => {
    it('round trips', async function () {
      this.timeout(40 * 1000)

      const peers = await createPeerId(50)
      peers.forEach((id, i) => {
        expect(utils.isPublicKeyKey(utils.keyForPublicKey(id))).to.eql(true)
        expect(utils.fromPublicKeyKey(utils.keyForPublicKey(id)).id)
          .to.eql(id.id)
      })
    })
  })
})
