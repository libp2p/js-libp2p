/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
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
