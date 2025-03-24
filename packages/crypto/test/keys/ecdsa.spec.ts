/* eslint-env mocha */
import { isPrivateKey, isPublicKey } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { randomBytes } from '../../src/index.js'
import { unmarshalECDSAPrivateKey, unmarshalECDSAPublicKey } from '../../src/keys/ecdsa/utils.js'
import { generateKeyPair, privateKeyFromProtobuf, privateKeyFromRaw, publicKeyFromProtobuf, publicKeyFromRaw } from '../../src/keys/index.js'
import fixtures from '../fixtures/go-key-ed25519.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import type { Curve } from '../../src/keys/index.js'
import type { ECDSAPrivateKey } from '@libp2p/interface'
import pbKeys from '../fixtures/ecdsa.js'
import { PrivateKey, PublicKey } from '../../src/keys/keys.js'

const CURVES: Curve[] = ['P-256', 'P-384', 'P-521']

describe('ECDSA', function () {
  this.timeout(20 * 1000)
  let key: ECDSAPrivateKey

  before(async () => {
    key = await generateKeyPair('ECDSA')
    expect(key).to.have.property('type', 'ECDSA')
  })

  it('generates a valid key', async () => {
    expect(key).to.have.property('type', 'ECDSA')
    expect(key.equals(key)).to.be.true()
    expect(key.raw).to.have.length(121)
    expect(key.publicKey.raw).to.have.length(87)
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.publicKey.verify(text, sig)
    expect(res).to.be.be.true()
  })

  it.skip('signs a list', async () => {
    const text = new Uint8ArrayList(
      randomBytes(512),
      randomBytes(512)
    )
    const sig = await key.sign(text)

    await expect(key.sign(text.subarray()))
      .to.eventually.deep.equal(sig, 'list did not have same signature as a single buffer')

    await expect(key.publicKey.verify(text, sig))
      .to.eventually.be.true('did not verify message as list')
    await expect(key.publicKey.verify(text.subarray(), sig))
      .to.eventually.be.true('did not verify message as single buffer')
  })

  CURVES.forEach(curve => {
    it(`encoding ${curve}`, async () => {
      const key = await generateKeyPair('ECDSA', curve)
      const keyMarshal = key.raw
      const key2 = unmarshalECDSAPrivateKey(keyMarshal)

      // @ts-expect-error private field
      expect(key._key.d).to.equal(key2._key.d)

      const keyMarshal2 = key2.raw
      expect(keyMarshal).to.equalBytes(keyMarshal2)

      const pk = key.publicKey
      const pkMarshal = pk.raw
      const pk2 = unmarshalECDSAPublicKey(pkMarshal)

      // @ts-expect-error private field
      expect(pk._key.x).to.deep.equal(pk2._key.x)
      // @ts-expect-error private field
      expect(pk._key.y).to.deep.equal(pk2._key.y)

      const pkMarshal2 = pk2.raw
      expect(pkMarshal).to.equalBytes(pkMarshal2)
    })

    it(`imports ${curve} private key from raw`, async () => {
      const key = await generateKeyPair('ECDSA', curve)
      const imported = privateKeyFromRaw(key.raw)

      expect(key.equals(imported)).to.be.true()
    })

    it(`imports ${curve} public key from raw`, async () => {
      const key = await generateKeyPair('ECDSA', curve)
      const imported = publicKeyFromRaw(key.publicKey.raw)

      expect(key.publicKey.equals(imported)).to.be.true()
    })
  })

  it('publicKey toString', async () => {
    const key = privateKeyFromProtobuf(fixtures.verify.privateKey)
    expect(key.publicKey.toString()).to.eql('12D3KooWLqLxEfJ9nDdEe8Kh8PFvNPQRYDQBwyL7CMM7HhVd5LsX')
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.be.true()

      expect(key.publicKey.equals(key.publicKey)).to.be.true()
    })

    it('not equals other key', async () => {
      const key2 = await generateKeyPair('ECDSA')

      expect(key.equals(key2)).to.be.false()
      expect(key2.equals(key)).to.be.false()
      expect(key.publicKey.equals(key2.publicKey)).to.be.false()
      expect(key2.publicKey.equals(key.publicKey)).to.be.false()
    })
  })

  it('sign and verify', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(data, sig)
    expect(valid).to.be.true()
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.be.false()
  })

  it('throws error instead of crashing', () => {
    const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2)
    testGarbage('unmarshalPrivateKey', privateKeyFromProtobuf)
  })

  it('is PrivateKey', async () => {
    const key = await generateKeyPair('ECDSA')

    expect(isPrivateKey(key)).to.be.true()
    expect(isPublicKey(key)).to.be.false()
  })

  it('is PublicKey', async () => {
    const key = await generateKeyPair('ECDSA')

    expect(isPrivateKey(key.publicKey)).to.be.false()
    expect(isPublicKey(key.publicKey)).to.be.true()
  })

  it('should round trip examples from libp2p spec', async () => {
    const pbPrivKey = PrivateKey.decode(pbKeys.pbmPrivateKey)
    expect(pbPrivKey).to.have.property('Type', 'ECDSA')
    const priv = unmarshalECDSAPrivateKey(pbPrivKey.Data ?? Uint8Array.from([]))
    expect(priv.raw).to.equalBytes(pbPrivKey.Data)

    const pbPubKey = PublicKey.decode(pbKeys.pbmPrivateKey)
    expect(pbPubKey).to.have.property('Type', 'ECDSA')
    const pub = unmarshalECDSAPrivateKey(pbPubKey.Data ?? Uint8Array.from([]))
    expect(pub.raw).to.equalBytes(pbPubKey.Data)
  })

  it('should round trip examples from rfc9500', async () => {
    const p256 = 'MHcCAQEEIObLW92AqkWunJXowVR2Z5/+yVPBaFHnEedDk5WJxk/BoAoGCCqGSM49AwEHoUQDQgAEQiVI+I+3gv+17KN0RFLHKh5Vj71vc75eSOkyMsxFxbFsTNEMTLjVuKFxOelIgsiZJXKZNCX0FBmrfpCkKklCcg=='
    const k256 = unmarshalECDSAPrivateKey(uint8ArrayFromString(p256, 'base64pad'))
    const m256 = uint8ArrayToString(k256.raw, 'base64pad')
    expect(m256).to.equal(p256)

    const p384 = 'MIGkAgEBBDDiVjMo36v2gYhga5EyQoHB1YpEVkMbCdUQs1/syfMHyhgihG+iZxNxqagbrA41dJ2gBwYFK4EEACKhZANiAARbCQG4hSMpbrkZ1Q/6GpyzdLxNQJWGKCv+yhGx2VrbtUc0r1cL+CtyKM8ia89MJd28/jsaOtOUMO/3Y+HWjS4VHZFyC3eVtY2ms0Y5YTqPubWo2kjGdHEX+ZGehCTzfsg='
    const k384 = unmarshalECDSAPrivateKey(uint8ArrayFromString(p384, 'base64pad'))
    const m384 = uint8ArrayToString(k384.raw, 'base64pad')
    expect(m384).to.equal(p384)

    const p521 = 'MIHcAgEBBEIB2STcygqIf42Zdno32HTmN6Esy0d9bghmU1ZpTWi3ZV5QaWOP3ntFyFQBPcd6NbGGVbhMlmpgIg1A+R7Z9RRYAuqgBwYFK4EEACOhgYkDgYYABAHQ/XJXqEx0f1YldcBzhdvr8vUr6lgIPbgv3RUx2KrjzIdf8C/3+i2iYNjrYtbS9dZJJ44yFzagYoy7swMItuYY2wD2KtIExkYDWbyBiriWG/Dw/A7FquikKBc85W8A3psVfB5cgsZPVi/K3vxKTCj200LPPvYW/ILTO3KFySHyvzb92A=='
    const k521 = unmarshalECDSAPrivateKey(uint8ArrayFromString(p521, 'base64pad'))
    const m521 = uint8ArrayToString(k521.raw, 'base64pad')
    expect(m521).to.equal(p521)
  })

  describe('go interop', () => {
    // @ts-check
    it('verifies with data from go', async () => {
      const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.be.true()
    })

    it('does not include the redundant public key when marshalling privatekey', async () => {
      const key = privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
      const bytes = key.raw
      expect(bytes.length).to.equal(64)
      expect(bytes.subarray(32)).to.eql(key.publicKey.raw)
    })

    it('verifies with data from go with redundant public key', async () => {
      const key = publicKeyFromProtobuf(fixtures.redundantPubKey.publicKey)
      const ok = await key.verify(fixtures.redundantPubKey.data, fixtures.redundantPubKey.signature)
      expect(ok).to.be.true()
    })

    it('generates the same signature as go', async () => {
      const key = privateKeyFromProtobuf(fixtures.verify.privateKey)
      const sig = await key.sign(fixtures.verify.data)
      expect(sig).to.eql(fixtures.verify.signature)
    })

    it('generates the same signature as go with redundant public key', async () => {
      const key = privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
      const sig = await key.sign(fixtures.redundantPubKey.data)
      expect(sig).to.eql(fixtures.redundantPubKey.signature)
    })
  })
})
