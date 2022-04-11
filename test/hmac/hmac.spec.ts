/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

import * as crypto from '../../src/index.js'

const hashes = ['SHA1', 'SHA256', 'SHA512'] as ['SHA1', 'SHA256', 'SHA512']

describe('HMAC', () => {
  hashes.forEach((hash) => {
    it(`${hash} - sign and verify`, async () => {
      const hmac = await crypto.hmac.create(hash, uint8ArrayFromString('secret'))
      const sig = await hmac.digest(uint8ArrayFromString('hello world'))
      expect(sig).to.have.length(hmac.length)
    })
  })
})
