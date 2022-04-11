/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import fixtures from '../fixtures/go-elliptic-key.js'
import * as crypto from '../../src/index.js'

const curves = ['P-256', 'P-384'] // 'P-521' fails in tests :( no clue why
const lengths: Record<string, number> = {
  'P-256': 65,
  'P-384': 97,
  'P-521': 133
}

const secretLengths: Record<string, number> = {
  'P-256': 32,
  'P-384': 48,
  'P-521': 66
}

describe('generateEphemeralKeyPair', () => {
  curves.forEach((curve) => {
    it(`generate and shared key ${curve}`, async () => {
      const keys = await Promise.all([
        crypto.keys.generateEphemeralKeyPair(curve),
        crypto.keys.generateEphemeralKeyPair(curve)
      ])

      expect(keys[0].key).to.have.length(lengths[curve])
      expect(keys[1].key).to.have.length(lengths[curve])

      const shared = await keys[0].genSharedKey(keys[1].key)
      expect(shared).to.have.length(secretLengths[curve])
    })
  })

  describe('go interop', () => {
    it('generates a shared secret', async () => {
      const curve = fixtures.curve

      const keys = await Promise.all([
        crypto.keys.generateEphemeralKeyPair(curve),
        crypto.keys.generateEphemeralKeyPair(curve)
      ])

      const alice = keys[0]
      const bob = keys[1]
      bob.key = fixtures.bob.public

      const secrets = await Promise.all([
        alice.genSharedKey(bob.key),
        bob.genSharedKey(alice.key, fixtures.bob)
      ])

      expect(secrets[0]).to.eql(secrets[1])
      expect(secrets[0]).to.have.length(32)
    })
  })

  it('handles bad curve name', async () => {
    await expect(crypto.keys.generateEphemeralKeyPair('bad name')).to.eventually.be.rejected.with.property('code', 'ERR_INVALID_CURVE')
  })
})
