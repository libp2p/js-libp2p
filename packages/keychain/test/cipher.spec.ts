import { privateKeyFromProtobuf } from '@libp2p/crypto'
import { PrivateKeyMessage } from '@libp2p/crypto/pb'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { expect } from 'aegir/chai'
import { base64 } from 'multiformats/bases/base64'
import sinon from 'sinon'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PRECOMPUTED_EMPTY_PASSWORD_KEY, decryptEntry, deriveDek, encryptEntry } from '../src/cipher.ts'
import { DEFAULT_LEGACY_DEK, decryptPem, deriveLegacyDek, isPem, rsaKeyFromPkcs8 } from '../src/legacy.ts'
import { getCrypto } from './fixtures/get-crypto.ts'
import { EC_OID, RSA_OID, garbageFor, notRsaFor, pkcs8, reencryptPem, tlv } from './fixtures/helpers.ts'
import { legacyKeychains } from './fixtures/legacy-keychains.ts'
import type { LegacyKeychain } from './fixtures/legacy-keychains.ts'

const plaintext = uint8ArrayFromString('hello')
const loader = getCrypto([secp256k1Crypto()])

async function encryptWithPrecomputedKey (data: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', PRECOMPUTED_EMPTY_PASSWORD_KEY, 'AES-GCM', false, ['encrypt'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherText = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new Uint8Array(data)))

  return base64.encode(uint8ArrayConcat([salt, iv, cipherText]))
}

async function fixturePkcs1 (): Promise<Uint8Array> {
  const pb = PrivateKeyMessage.decode(await decryptPem('', legacyKeychains[0].entries['/pkcs8/rsa-key']))

  return pb.Data ?? new Uint8Array()
}

async function publicKeyOf (pb: Uint8Array): Promise<string> {
  const key = await privateKeyFromProtobuf(pb, { getCrypto: loader })

  return base64.baseEncode(key.publicKey.toProtobuf())
}

function keysOf (fixture: LegacyKeychain, pem: boolean): Array<{ name: string, publicKey: string, entry: string }> {
  return fixture.keys
    .map(key => ({ name: key.name, publicKey: key.publicKey, entry: fixture.entries[`/pkcs8/${key.name}`] }))
    .filter(key => isPem(key.entry) === pem)
}

describe('cipher', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('round-trips under a derived dek', async () => {
    const dek = await deriveDek('a very long password indeed', { salt: uint8ArrayFromString('a salt of sixteen bytes'), iterations: 1000, hash: 'SHA-512' })

    expect(await decryptEntry(dek, await encryptEntry(dek, plaintext))).to.equalBytes(plaintext)
    await expect(decryptEntry(`${dek}x`, await encryptEntry(dek, plaintext))).to.eventually.be.rejected.with.property('name', 'DecryptionFailedError')
  })

  it('derives the same dek as the previous cipher', async () => {
    const dek = await deriveDek('a very long password indeed', { salt: uint8ArrayFromString('a salt of sixteen bytes'), iterations: 10_000, hash: 'SHA-512' })

    expect(dek).to.equal('jVquMl1XcBWvbrHCgbpDGtxewe6pGqQZStNbvFl-SoE')
  })

  it('uses an empty dek without a password', async () => {
    expect(await deriveDek('', { salt: new Uint8Array(16), iterations: 10_000, hash: 'SHA-512' })).to.equal('')
  })

  it('derives the legacy dek like the previous keychain', () => {
    const fixtures = legacyKeychains.filter(f => f.derivedDek != null)
    expect(fixtures).to.not.be.empty()

    for (const fixture of fixtures) {
      const salt = uint8ArrayFromString(fixture.dek!.salt)
      expect(deriveLegacyDek(fixture.init.pass, salt, fixture.dek!.iterationCount, { keyLength: fixture.dek!.keyLength, hash: fixture.dek!.hash as any })).to.equal(fixture.derivedDek)
    }
  })

  it('uses an empty legacy dek without a password', () => {
    expect(deriveLegacyDek(undefined, new Uint8Array(16), 10_000, DEFAULT_LEGACY_DEK)).to.equal('')
  })

  it('decrypts legacy RSA PEM entries', async () => {
    const fixture = legacyKeychains[0]
    const pem = fixture.entries['/pkcs8/rsa-key']
    const pb = await decryptPem('', pem)

    expect(pb[0]).to.equal(0x08)
  })

  for (const fixture of legacyKeychains) {
    const dek = fixture.derivedDek ?? ''

    it(`decrypts legacy PEM entries of the "${fixture.name}" fixture`, async () => {
      const keys = keysOf(fixture, true)
      expect(keys).to.not.be.empty()

      for (const key of keys) {
        expect(await publicKeyOf(await decryptPem(dek, key.entry))).to.equal(key.publicKey, key.name)
      }
    })

    it(`decrypts legacy AES-GCM entries of the "${fixture.name}" fixture`, async () => {
      const keys = keysOf(fixture, false)
      expect(keys).to.not.be.empty()

      for (const key of keys) {
        expect(await publicKeyOf(await decryptEntry(dek, key.entry))).to.equal(key.publicKey, key.name)
      }
    })
  }

  describe('legacy PEM validation', () => {
    it('accepts an RSA PrivateKeyInfo', async () => {
      const pkcs1 = await fixturePkcs1()

      expect(rsaKeyFromPkcs8(pkcs8(RSA_OID, pkcs1))).to.equalBytes(pkcs1)
    })

    it('rejects a PrivateKeyInfo that is not rsaEncryption', async () => {
      const pkcs1 = await fixturePkcs1()

      expect(() => rsaKeyFromPkcs8(pkcs8(EC_OID, pkcs1))).to.throw(/RSA/)
    })

    it('rejects an RSAPrivateKey with missing fields', () => {
      const truncated = tlv(0x30, Uint8Array.from([0x02, 0x01, 0x00, 0x02, 0x01, 0x05, 0x02, 0x01, 0x03, 0x02, 0x01, 0x07]))

      expect(() => rsaKeyFromPkcs8(pkcs8(RSA_OID, truncated))).to.throw()
    })

    it('rejects garbage DER', () => {
      expect(() => rsaKeyFromPkcs8(crypto.getRandomValues(new Uint8Array(1200)))).to.throw()
      expect(() => rsaKeyFromPkcs8(Uint8Array.from([0x30, 0x82, 0xff, 0xff, 0x02, 0x01, 0x00]))).to.throw()
      expect(() => rsaKeyFromPkcs8(new Uint8Array(20_000))).to.throw(/too long/)
    })

    it('rejects a correctly padded PEM plaintext that is not an RSA key', async () => {
      const fixture = legacyKeychains[1]
      const pem = fixture.entries['/pkcs8/rsa-key']
      const dek = fixture.derivedDek ?? ''
      const bogus = await reencryptPem(dek, pem, garbageFor(pem))

      await expect(decryptPem(dek, bogus)).to.eventually.be.rejected.with.property('name', 'DecryptionFailedError')
    })

    it('rejects a correctly padded PEM plaintext that holds a non-RSA PrivateKeyInfo', async () => {
      const fixture = legacyKeychains[1]
      const pem = fixture.entries['/pkcs8/rsa-key']
      const dek = fixture.derivedDek ?? ''
      const bogus = await reencryptPem(dek, pem, notRsaFor(pem))

      await expect(decryptPem(dek, bogus)).to.eventually.be.rejected.with.property('name', 'DecryptionFailedError')
    })
  })

  describe('empty password when PBKDF2 refuses it (WebKit/Linux)', () => {
    let refused = 0

    afterEach(() => {
      expect(refused).to.be.greaterThan(0)
      refused = 0
    })

    function refuseEmptyPbkdf2 (): void {
      const importKey = crypto.subtle.importKey.bind(crypto.subtle)
      sinon.stub(crypto.subtle, 'importKey').callsFake(async (format: any, data: any, algorithm: any, ...rest: any[]) => {
        if (format === 'raw' && (algorithm?.name ?? algorithm) === 'PBKDF2' && data.byteLength === 0) {
          refused++
          throw new DOMException('empty password', 'OperationError')
        }
        return importKey(format, data, algorithm, ...rest as [any, any])
      })
    }

    it('writes entries other platforms can read', async () => {
      refuseEmptyPbkdf2()
      const written = await encryptEntry('', plaintext)
      sinon.restore()

      expect(await decryptEntry('', written)).to.equalBytes(plaintext)
    })

    it('reads entries written with the precomputed key', async () => {
      const written = await encryptWithPrecomputedKey(plaintext)
      refuseEmptyPbkdf2()

      expect(await decryptEntry('', written)).to.equalBytes(plaintext)
    })

    it('reads legacy AES-GCM entries', async () => {
      refuseEmptyPbkdf2()

      for (const key of keysOf(legacyKeychains[0], false)) {
        expect(await publicKeyOf(await decryptEntry('', key.entry))).to.equal(key.publicKey, key.name)
      }
    })

    it('reads legacy RSA PEM entries', async () => {
      refuseEmptyPbkdf2()
      const pb = await decryptPem('', legacyKeychains[0].entries['/pkcs8/rsa-key'])

      expect(pb[0]).to.equal(0x08)
    })
  })
})
