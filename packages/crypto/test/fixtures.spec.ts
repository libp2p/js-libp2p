import { expect } from 'aegir/chai'
import { base58btc } from 'multiformats/bases/base58'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createCryptoLoader, privateKeyFromProtobuf, publicKeyFromProtobuf } from '../src/index.ts'
import { secp256k1Crypto } from '../src/secp256k1.ts'
import ecdsa from './fixtures/ecdsa.ts'
import goEd25519 from './fixtures/go-key-ed25519.ts'
import goRsa from './fixtures/go-key-rsa.ts'
import goSecp256k1 from './fixtures/go-key-secp256k1.ts'
import { pkcs1FromJwk } from './fixtures/rsa-jwk.ts'
import { RSA_KEY_1024_BITS, RSA_KEY_2048_BITS, RSA_KEY_512_BITS } from './fixtures/rsa.ts'
import secp256k1 from './fixtures/secp256k1.ts'

interface Fixture {
  name: string
  privateKey?: Uint8Array
  publicKey?: Uint8Array
  /**
   * The expected public key protobuf, when it is not the publicKey fixture
   */
  expectedPublicKey?: Uint8Array
  /**
   * The base58btc multihash of the public key as computed by the 5.1.25 release
   */
  peerId: string
  signature?: { data: Uint8Array, signature: Uint8Array }
}

const fixtures: Fixture[] = [{
  name: 'go Ed25519 key with a redundant public key',
  privateKey: goEd25519.redundantPubKey.privateKey,
  publicKey: goEd25519.redundantPubKey.publicKey,
  peerId: '12D3KooWRWfGD8v8pLXtuRZaERfubgBZZEpkgPZKP4FojE2dtWgc',
  signature: goEd25519.redundantPubKey
}, {
  name: 'go Ed25519 key',
  privateKey: goEd25519.verify.privateKey,
  publicKey: goEd25519.verify.publicKey,
  peerId: '12D3KooWLqLxEfJ9nDdEe8Kh8PFvNPQRYDQBwyL7CMM7HhVd5LsX',
  signature: goEd25519.verify
}, {
  name: 'go RSA key',
  privateKey: goRsa.private.key,
  publicKey: goRsa.public.key,
  peerId: 'QmVvAUvVMDhsWPXysXi4q5ZNAYBUTnAuX4XAWcFqWxNbR5'
}, {
  name: 'go RSA verification key',
  publicKey: goRsa.verify.publicKey,
  peerId: 'QmVqkWPYn5WSgETUdviL63uR62sRT7ZKQHAohanttCgQ5C',
  signature: goRsa.verify
}, {
  name: 'RSA 512 bit JWK',
  privateKey: pkcs1FromJwk(RSA_KEY_512_BITS.privateKey),
  peerId: 'QmRBCCHKGAG75RfwArzGxmAN2CpY6kgG73d9u2w6dfF7d4'
}, {
  name: 'RSA 1024 bit JWK',
  privateKey: pkcs1FromJwk(RSA_KEY_1024_BITS.privateKey),
  peerId: 'QmShNioyubQTA4RJ8UP6oJwiJUVaryXw14oTqb7xSg3zdZ'
}, {
  name: 'RSA 2048 bit JWK',
  privateKey: pkcs1FromJwk(RSA_KEY_2048_BITS.privateKey),
  peerId: 'QmTxAD5Ts7LvEA1aRz7WuPcxES3AxmrhiG7XJbxMsXUSfy'
}, {
  name: 'ECDSA key',
  privateKey: ecdsa.pbmPrivateKey,
  expectedPublicKey: uint8ArrayFromString('080312573055020101a00a06082a8648ce3d030107a14403420004de3d300fa36ae0e8f5d530899d83abab44abf3161f162a4bc901d8e6ecda020e8b6d5f8da30525e71d6851510c098e5c47c646a597fb4dcec034e9f77c409e62', 'base16'),
  peerId: '15nwicNTdYXUW1QouYah7fkn86azMy1k7LdbUJscxnCyzyNC9TxKTyzw6ycuWxsBYwmHPM9UgTMULugdej5icskTeJAxWjvKRgGUQkdPz3T3SFPXHbjccEqReSGsv2M'
}, {
  name: 'secp256k1 key',
  privateKey: secp256k1.pbmPrivateKey,
  publicKey: secp256k1.pbmPublicKey,
  peerId: '16Uiu2HAmQ5F5jnvUF5XCtYjWNhNMQzFy78Sfj6J4va3zJehksNji'
}, {
  name: 'go secp256k1 key',
  privateKey: goSecp256k1.privateKey,
  publicKey: goSecp256k1.publicKey,
  peerId: '16Uiu2HAm5vpzEwJ41kQmnwDu9moFusdc16wV1oCUd1AHLgFgPpKY',
  signature: { data: goSecp256k1.message, signature: goSecp256k1.signature }
}]

describe('key fixtures', function () {
  this.timeout(30_000)

  // secp256k1 is opt-in
  const getCrypto = createCryptoLoader([secp256k1Crypto()])

  for (const fixture of fixtures) {
    describe(fixture.name, () => {
      it('has the same public key and peer id as @libp2p/crypto@5.1.25', async () => {
        const expectedPublicKey = fixture.expectedPublicKey ?? fixture.publicKey

        if (fixture.privateKey != null) {
          const key = await privateKeyFromProtobuf(fixture.privateKey, { getCrypto })

          if (expectedPublicKey != null) {
            expect(key.publicKey.toProtobuf()).to.equalBytes(expectedPublicKey)
          }

          expect(base58btc.encode(key.publicKey.toMultihash().bytes).substring(1)).to.equal(fixture.peerId)
        }

        if (fixture.publicKey != null) {
          const key = await publicKeyFromProtobuf(fixture.publicKey, { getCrypto })

          expect(key.toProtobuf()).to.equalBytes(fixture.publicKey)
          expect(base58btc.encode(key.toMultihash().bytes).substring(1)).to.equal(fixture.peerId)
        }
      })

      if (fixture.signature != null) {
        const { data, signature } = fixture.signature
        const publicKey = fixture.publicKey

        it('verifies the fixture signature', async () => {
          if (publicKey == null) {
            throw new Error('Fixture is missing a public key')
          }

          const key = await publicKeyFromProtobuf(publicKey, { getCrypto })

          expect(await key.verify(data, signature)).to.be.true()
          expect(await key.verify(uint8ArrayFromString('other'), signature)).to.be.false()
        })
      }
    })
  }

  it('matches the go RSA multihashes', async () => {
    const privateKey = await privateKeyFromProtobuf(goRsa.private.key)
    const publicKey = await publicKeyFromProtobuf(goRsa.public.key)

    expect(publicKey.toMultihash().bytes).to.equalBytes(goRsa.public.hash)
    expect(privateKey.publicKey.toMultihash().bytes).to.equalBytes(goRsa.public.hash)
  })
})
