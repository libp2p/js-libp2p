/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import * as crypto from '../src/index.js'
import fixtures from './fixtures/go-key-rsa.js'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { RsaPrivateKey, RsaPublicKey } from '../src/keys/rsa-class.js'

describe('libp2p-crypto', function () {
  this.timeout(20 * 1000)
  let key: RsaPrivateKey
  before(async () => {
    const generated = await crypto.keys.generateKeyPair('RSA', 512)

    if (!(generated instanceof RsaPrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    key = generated
  })

  it('marshalPublicKey and unmarshalPublicKey', () => {
    const key2 = crypto.keys.unmarshalPublicKey(crypto.keys.marshalPublicKey(key.public))

    if (!(key2 instanceof RsaPublicKey)) {
      throw new Error('Wrong key type unmarshalled')
    }

    expect(key2.equals(key.public)).to.be.eql(true)

    expect(() => {
      crypto.keys.marshalPublicKey(key.public, 'invalid-key-type')
    }).to.throw()
  })

  it('marshalPrivateKey and unmarshalPrivateKey', async () => {
    expect(() => {
      crypto.keys.marshalPrivateKey(key, 'invalid-key-type')
    }).to.throw()

    const key2 = await crypto.keys.unmarshalPrivateKey(crypto.keys.marshalPrivateKey(key))

    if (!(key2 instanceof RsaPrivateKey)) {
      throw new Error('Wrong key type unmarshalled')
    }

    expect(key2.equals(key)).to.be.eql(true)
    expect(key2.public.equals(key.public)).to.be.eql(true)
  })

  it('generateKeyPair', () => {
    // @ts-expect-error key type is invalid
    return expect(crypto.keys.generateKeyPair('invalid-key-type', 512)).to.eventually.be.rejected.with.property('code', 'ERR_UNSUPPORTED_KEY_TYPE')
  })

  it('generateKeyPairFromSeed', () => {
    const seed = crypto.randomBytes(32)

    // @ts-expect-error key type is invalid
    return expect(crypto.keys.generateKeyPairFromSeed('invalid-key-type', seed, 512)).to.eventually.be.rejected.with.property('code', 'ERR_UNSUPPORTED_KEY_DERIVATION_TYPE')
  })

  // marshalled keys seem to be slightly different
  // unsure as to if this is just a difference in encoding
  // or a bug
  describe('go interop', () => {
    it('unmarshals private key', async () => {
      const key = await crypto.keys.unmarshalPrivateKey(fixtures.private.key)
      const hash = fixtures.private.hash
      expect(fixtures.private.key).to.eql(key.bytes)
      const digest = await key.hash()
      expect(digest).to.eql(hash)
    })

    it('unmarshals public key', async () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.public.key)
      const hash = fixtures.public.hash
      expect(crypto.keys.marshalPublicKey(key)).to.eql(fixtures.public.key)
      const digest = await key.hash()
      expect(digest).to.eql(hash)
    })

    it('unmarshal -> marshal, private key', async () => {
      const key = await crypto.keys.unmarshalPrivateKey(fixtures.private.key)
      const marshalled = crypto.keys.marshalPrivateKey(key)
      expect(marshalled).to.eql(fixtures.private.key)
    })

    it('unmarshal -> marshal, public key', () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.public.key)
      const marshalled = crypto.keys.marshalPublicKey(key)
      expect(uint8ArrayEquals(fixtures.public.key, marshalled)).to.eql(true)
    })
  })

  describe('pbkdf2', () => {
    it('generates a derived password using sha1', () => {
      const p1 = crypto.pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'sha1')
      expect(p1).to.exist()
      expect(p1).to.be.a('string')
    })

    it('generates a derived password using sha2-512', () => {
      const p1 = crypto.pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'sha2-512')
      expect(p1).to.exist()
      expect(p1).to.be.a('string')
    })

    it('generates the same derived password with the same options', () => {
      const p1 = crypto.pbkdf2('password', 'at least 16 character salt', 10, 512 / 8, 'sha1')
      const p2 = crypto.pbkdf2('password', 'at least 16 character salt', 10, 512 / 8, 'sha1')
      const p3 = crypto.pbkdf2('password', 'at least 16 character salt', 11, 512 / 8, 'sha1')
      expect(p2).to.equal(p1)
      expect(p3).to.not.equal(p2)
    })

    it('throws on invalid hash name', () => {
      const fn = (): string => crypto.pbkdf2('password', 'at least 16 character salt', 500, 512 / 8, 'shaX-xxx')
      expect(fn).to.throw().with.property('code', 'ERR_UNSUPPORTED_HASH_TYPE')
    })
  })

  describe('randomBytes', () => {
    it('throws with invalid number passed', () => {
      expect(() => {
        crypto.randomBytes(-1)
      }).to.throw()
    })

    it('generates different random things', () => {
      const buf1 = crypto.randomBytes(10)
      expect(buf1.length).to.equal(10)
      const buf2 = crypto.randomBytes(10)
      expect(buf1).to.not.eql(buf2)
    })
  })
})
