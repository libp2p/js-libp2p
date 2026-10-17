/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { generateKeyPair, publicKeyForPeer, publicKeyToProtobuf } from '../../src/keys/index.ts'
import type { PeerId, PublicKey } from '@libp2p/interface'

type Peer = Pick<PeerId, 'publicKey' | 'toMultihash'>

// a peer id as parsed from the wire: an inlined key for Ed25519/secp256k1, no
// key for RSA
function peerFor (key: PublicKey): Peer {
  return {
    publicKey: key.type === 'RSA' ? undefined : key,
    toMultihash: () => key.toMultihash()
  } as any
}

describe('publicKeyForPeer', function () {
  this.timeout(20 * 1000)

  it('returns the key inlined in an Ed25519 peer id', async () => {
    const key = (await generateKeyPair('Ed25519')).publicKey

    await expect(publicKeyForPeer(peerFor(key))).to.eventually.equal(key)
  })

  it('accepts a supplied key that derives to an Ed25519 peer id', async () => {
    const key = (await generateKeyPair('Ed25519')).publicKey

    const result = await publicKeyForPeer(peerFor(key), publicKeyToProtobuf(key))

    expect(result.toMultihash().bytes).to.equalBytes(key.toMultihash().bytes)
  })

  it('rejects a supplied key that does not derive to an Ed25519 peer id', async () => {
    const victim = (await generateKeyPair('Ed25519')).publicKey
    const attacker = (await generateKeyPair('Ed25519')).publicKey

    await expect(publicKeyForPeer(peerFor(victim), attacker)).to.eventually.be.rejected
      .with.property('name', 'InvalidPublicKeyError')
  })

  it('rejects a supplied key that does not derive to a secp256k1 peer id', async () => {
    const victim = (await generateKeyPair('secp256k1')).publicKey
    const attacker = (await generateKeyPair('Ed25519')).publicKey

    await expect(publicKeyForPeer(peerFor(victim), attacker)).to.eventually.be.rejected
      .with.property('name', 'InvalidPublicKeyError')
  })

  it('rejects malformed key bytes', async () => {
    const key = (await generateKeyPair('Ed25519')).publicKey

    await expect(publicKeyForPeer(peerFor(key), uint8ArrayFromString('not a key'))).to.eventually.be.rejected
      .with.property('name', 'InvalidPublicKeyError')
  })

  describe('RSA peer id without a key', () => {
    let key: PublicKey

    before(async () => {
      key = (await generateKeyPair('RSA', 2048)).publicKey
    })

    it('accepts a supplied key that derives to the peer id', async () => {
      const result = await publicKeyForPeer(peerFor(key), publicKeyToProtobuf(key))

      expect(result.toMultihash().bytes).to.equalBytes(key.toMultihash().bytes)
    })

    it('rejects a supplied key that does not derive to the peer id', async () => {
      const attacker = (await generateKeyPair('Ed25519')).publicKey

      await expect(publicKeyForPeer(peerFor(key), attacker)).to.eventually.be.rejected
        .with.property('name', 'InvalidPublicKeyError')
    })

    it('rejects when no key is supplied', async () => {
      await expect(publicKeyForPeer(peerFor(key))).to.eventually.be.rejected
        .with.property('name', 'InvalidPublicKeyError')
    })
  })

  it('rejects a URL peer id', async () => {
    const url: Peer = {
      publicKey: undefined,
      toMultihash: () => identity.digest(uint8ArrayFromString('https://example.com'))
    } as any

    await expect(publicKeyForPeer(url)).to.eventually.be.rejected
      .with.property('name', 'InvalidPublicKeyError')
  })

  it('rejects when aborted', async () => {
    const key = (await generateKeyPair('Ed25519')).publicKey

    await expect(publicKeyForPeer(peerFor(key), undefined, { signal: AbortSignal.abort() })).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })
})
