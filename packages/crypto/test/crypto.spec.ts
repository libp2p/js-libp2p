/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { base58btc } from 'multiformats/bases/base58'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { generateKeyPair, generateKeyPairFromSeed, privateKeyFromProtobuf, privateKeyToProtobuf, publicKeyFromProtobuf, publicKeyToProtobuf } from '../src/keys/index.js'
import pbkdf2 from '../src/pbkdf2.js'
import randomBytes from '../src/random-bytes.js'
import fixtures from './fixtures/go-key-rsa.js'
import type { RSAPrivateKey } from '@libp2p/interface'

describe('libp2p-crypto', function () {
  this.timeout(20 * 1000)
  let key: RSAPrivateKey

  before(async () => {
    key = await generateKeyPair('RSA', 512)
  })

  it('marshalPublicKey and unmarshalPublicKey', async () => {
    const key2 = publicKeyFromProtobuf(publicKeyToProtobuf(key.publicKey))

    expect(key2).to.have.property('type', 'RSA')
    expect(key2.equals(key.publicKey)).to.be.eql(true)
  })

  it('marshalPrivateKey and unmarshalPrivateKey', async () => {
    const key2 = privateKeyFromProtobuf(privateKeyToProtobuf(key))

    expect(key2).to.have.property('type', 'RSA')
    expect(key2.equals(key)).to.be.true()
    expect(key2.publicKey.equals(key.publicKey)).to.be.true()
  })

  it('generateKeyPair', () => {
    // @ts-expect-error key type is invalid
    return expect(generateKeyPair('invalid-key-type', 512)).to.eventually.be.rejected
      .with.property('name', 'UnsupportedKeyTypeError')
  })

  it('generateKeyPairFromSeed', () => {
    const seed = randomBytes(32)

    // @ts-expect-error key type is invalid
    return expect(generateKeyPairFromSeed('invalid-key-type', seed, 512)).to.eventually.be.rejected
      .with.property('name', 'UnsupportedKeyTypeError')
  })

  // https://github.com/libp2p/js-libp2p-crypto/issues/314
  function isSafari (): boolean {
    return typeof navigator !== 'undefined' && navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome') && navigator.userAgent.includes('Mac')
  }

  // marshaled keys seem to be slightly different
  // unsure as to if this is just a difference in encoding
  // or a bug
  describe.skip('go interop', () => {
    it.skip('unmarshals private key', async () => {
      if (isSafari()) {
        // eslint-disable-next-line no-console
        console.warn('Skipping test in Safari. Known bug: https://github.com/libp2p/js-libp2p-crypto/issues/314')
        return
      }

      const key = privateKeyFromProtobuf(fixtures.private.key)
      expect(fixtures.private.key).to.equalBytes(key.raw)

      const hash = fixtures.private.hash
      const digest = key.publicKey.toCID().multihash
      expect(base58btc.encode(digest.bytes)).to.equal(hash)
    })

    it('unmarshals public key', async () => {
      const key = publicKeyFromProtobuf(fixtures.public.key)
      const hash = fixtures.public.hash
      expect(publicKeyToProtobuf(key)).to.equalBytes(fixtures.public.key)

      const digest = key.toCID().multihash
      expect(base58btc.encode(digest.bytes)).to.equal(hash)
    })

    it.skip('unmarshal -> marshal, private key', async () => {
      const key = privateKeyFromProtobuf(fixtures.private.key)
      const marshaled = privateKeyToProtobuf(key)

      if (isSafari()) {
        // eslint-disable-next-line no-console
        console.warn('Running differnt test in Safari. Known bug: https://github.com/libp2p/js-libp2p-crypto/issues/314')
        const key2 = privateKeyFromProtobuf(marshaled)
        expect(key2.raw).to.equalBytes(key.raw)
        return
      }

      expect(marshaled).to.equalBytes(fixtures.private.key)
    })

    it('unmarshal -> marshal, public key', async () => {
      const key = publicKeyFromProtobuf(fixtures.public.key)
      const marshaled = publicKeyToProtobuf(key)
      expect(uint8ArrayEquals(fixtures.public.key, marshaled)).to.be.true()
    })
  })

  describe('pbkdf2', () => {
    it('generates a derived password using sha1', () => {
      const p1 = pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'sha1')
      expect(p1).to.exist()
      expect(p1).to.be.a('string')
    })

    it('generates a derived password using sha2-512', () => {
      const p1 = pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'sha2-512')
      expect(p1).to.exist()
      expect(p1).to.be.a('string')
    })

    it('generates the same derived password with the same options', () => {
      const p1 = pbkdf2('password', 'at least 16 character salt', 10, 512 / 8, 'sha1')
      const p2 = pbkdf2('password', 'at least 16 character salt', 10, 512 / 8, 'sha1')
      const p3 = pbkdf2('password', 'at least 16 character salt', 11, 512 / 8, 'sha1')
      expect(p2).to.equal(p1)
      expect(p3).to.not.equal(p2)
    })

    it('throws on invalid hash name', () => {
      const fn = (): string => pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'shaX-xxx')
      expect(fn).to.throw().with.property('name', 'InvalidParametersError')
    })
  })

  describe('randomBytes', () => {
    it('throws with invalid number passed', () => {
      expect(() => {
        randomBytes(-1)
      }).to.throw()
    })

    it('generates different random things', () => {
      const buf1 = randomBytes(10)
      expect(buf1.length).to.equal(10)
      const buf2 = randomBytes(10)
      expect(buf1).to.not.eql(buf2)
    })
  })
})
