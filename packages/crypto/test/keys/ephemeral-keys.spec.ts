/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { generateEphemeralKeyPair } from '../../src/keys/index.js'
import fixtures from '../fixtures/go-elliptic-key.js'
import type { Curve } from '../../src/keys/ecdh/index.js'

const curves: Curve[] = ['P-256', 'P-384', 'P-521']
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
        generateEphemeralKeyPair(curve),
        generateEphemeralKeyPair(curve)
      ])

      expect(keys[0].key).to.have.length(lengths[curve])
      expect(keys[1].key).to.have.length(lengths[curve])

      const shared = await keys[0].genSharedKey(keys[1].key)
      expect(shared).to.have.length(secretLengths[curve])
    })
  })

  describe('go interop', () => {
    curves.forEach((curve) => {
      it(`generates a shared secret ${curve}`, async () => {
        const keys = await Promise.all([
          generateEphemeralKeyPair(curve),
          generateEphemeralKeyPair(curve)
        ])

        const alice = keys[0]
        const bob = keys[1]
        alice.key = fixtures[curve].alice.public
        bob.key = fixtures[curve].bob.public

        const secrets = await Promise.all([
          alice.genSharedKey(bob.key, fixtures[curve].alice),
          bob.genSharedKey(alice.key, fixtures[curve].bob)
        ])

        expect(secrets[0]).to.eql(secrets[1])
        expect(secrets[0]).to.eql(fixtures[curve].shared)
        expect(secrets[0]).to.have.length(secretLengths[curve])
      })
    })
  })

  it('handles bad curve name', async () => {
    // @ts-expect-error argument is not a Curve
    await expect(generateEphemeralKeyPair('bad name')).to.eventually.be.rejected
      .with.property('name', 'InvalidParametersError')
  })
})
