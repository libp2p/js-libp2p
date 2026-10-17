import { ed25519Crypto } from '@ipshipyard/crypto'
import { isPrivateKey, isPublicKey } from '@ipshipyard/crypto'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { keychain as libp2pKeychainFactory } from '@libp2p/keychain'
import { expect } from 'aegir/chai'
import { defaultLogger } from 'birnam'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Keychain as KeychainClass } from '../src/keychain.ts'
import { getCrypto } from './fixtures/get-crypto.ts'
import type { Keychain } from '../src/index.ts'
import type { KeychainInit } from '../src/index.ts'
import type { PrivateKey } from '@ipshipyard/crypto'
import type { Keychain as Libp2pKeychain } from '@libp2p/keychain'
import type { Datastore } from 'interface-datastore'

const SUPPORTED_KEYS: Array<'ECDSA' | 'Ed25519' | 'RSA'> = [
  'ECDSA',
  'Ed25519',
  'RSA'
]

describe('keychain', () => {
  const password = 'this is not a secure phrase'
  /* spell-checker:disable-next-line */
  const rsaKeyName = 'tajné jméno'
  /* spell-checker:disable-next-line */
  const renamedRsaKeyName = 'ชื่อลับ'
  let datastore: Datastore

  beforeEach(() => {
    datastore = new MemoryDatastore()
  })

  it('can override the self key name', async () => {
    const selfKey = 'other-key'
    const keychain = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    }, {
      selfKey
    })

    const crypto = ed25519Crypto()
    const privateKey = await crypto.generatePrivateKey()

    await keychain.importKey(selfKey, privateKey)
    await expect(keychain.removeKey(selfKey)).to.eventually.be.rejected()

    await keychain.importKey('self', privateKey)
    await expect(keychain.removeKey('self')).to.eventually.not.be.rejected()
  })

  it('needs a NIST SP 800-132 non-weak pass phrase', async () => {
    await expect(async function () {
      return new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      }, {
        password: '< 20 character'
      })
    }()).to.eventually.be.rejected()
  })

  it('supports supported hashing algorithms', async () => {
    const ok = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    }, {
      password,
      hash: 'SHA-256',
      salt: 'salt-salt-salt-salt',
      iterations: 1000
    })
    expect(ok).to.exist()
  })

  it('does not support unsupported hashing algorithms', async () => {
    await expect(async function () {
      return new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      }, {
        // @ts-expect-error invalid parameter
        hash: 'my-hash'
      })
    }()).to.eventually.be.rejected()
  })

  it('can list keys without a password', async () => {
    const keychain = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    })

    await expect(all(keychain.listKeys())).to.eventually.have.lengthOf(0)
  })

  it('can remove a key without a password', async () => {
    const keychainWithoutPassword = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    })
    const keychainWithPassword = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    }, {
      password: `hello-${Date.now()}-${Date.now()}`
    })
    const name = `key-${Math.random()}`

    const crypto = ed25519Crypto()
    const privateKey = await crypto.generatePrivateKey()
    await keychainWithPassword.importKey(name, privateKey)

    let keys = await all(keychainWithoutPassword.listKeys())
    expect(keys).to.have.lengthOf(1)
    expect(keys).to.have.nested.property('[0].name', name)

    await keychainWithoutPassword.removeKey(name)
    keys = await all(keychainWithoutPassword.listKeys())
    expect(keys).to.have.lengthOf(0)
  })

  it('should validate key names before removing', async () => {
    const keychain = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    })

    const errors = await Promise.all([
      keychain.removeKey('../../nasty').catch(err => err),
      keychain.removeKey('').catch(err => err),
      keychain.removeKey('    ').catch(err => err),
      // @ts-expect-error invalid parameters
      keychain.removeKey(null).catch(err => err),
      // @ts-expect-error invalid parameters
      keychain.removeKey(undefined).catch(err => err)
    ])

    expect(errors).to.have.length(5)
    errors.forEach(error => {
      expect(error).to.have.property('name', 'InvalidParametersError')
    })
  })

  it('does not overwrite existing key', async () => {
    const keychain = new KeychainClass({
      datastore,
      getCrypto: getCrypto()
    })

    const keyName = 'my-key'
    const privateKey = await keychain.generateKey(keyName)

    await expect(keychain.importKey(keyName, privateKey)).to.eventually.be.rejected
      .with.property('name', 'InvalidParametersError')
  })

  describe('query', () => {
    let keychain: Keychain
    let privateKey: PrivateKey

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })

      privateKey = await keychain.generateKey(rsaKeyName, {
        type: 'RSA'
      })
    })

    it('finds all existing keys', async () => {
      const keys = await all(keychain.listKeys())
      expect(keys).to.exist()
      const myKey = keys.find((k) => k.name.normalize() === rsaKeyName.normalize())
      expect(myKey).to.exist()
    })

    it('exports a key by name', async () => {
      const key = await keychain.exportKey(rsaKeyName)
      expect(key).to.exist()
      expect(key.toProtobuf()).to.equalBytes(privateKey.toProtobuf())
    })

    it('returns the key name', async () => {
      const keys = await all(keychain.listKeys())
      expect(keys).to.exist()
      keys.forEach((key) => {
        expect(key).to.have.property('name')
      })
    })
  })

  describe('exported key', () => {
    let keychain: Keychain
    let privateKey: PrivateKey

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })

      privateKey = await keychain.generateKey(rsaKeyName, {
        type: 'RSA'
      })
    })

    it('requires the key name', async () => {
      // @ts-expect-error invalid parameters
      await expect(keychain.exportKey(undefined, 'password')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('can be imported', async () => {
      const imported = await keychain.importKey('imported-key', privateKey)
      expect(imported).to.deep.equal(privateKey)

      const exported = await keychain.exportKey('imported-key')
      expect(exported.toProtobuf()).to.equalBytes(privateKey.toProtobuf())
    })

    it('requires the key', async () => {
      // @ts-expect-error invalid parameters
      await expect(keychain.importKey('imported-key', undefined)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('cannot be imported as an existing key name', async () => {
      await expect(keychain.importKey(rsaKeyName, privateKey)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })

  describe('rename', () => {
    let keychain: Keychain
    let privateKey: PrivateKey

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })

      privateKey = await keychain.generateKey(rsaKeyName, {
        type: 'RSA'
      })
    })

    it('requires an existing key name', async () => {
      await expect(keychain.renameKey('not-there', renamedRsaKeyName)).to.eventually.be.rejected
        .with.property('name', 'NotFoundError')
    })

    it('requires a valid new key name', async () => {
      await expect(keychain.renameKey(rsaKeyName, '..\not-valid')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('does not overwrite existing key', async () => {
      await expect(keychain.renameKey(rsaKeyName, rsaKeyName)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('creates the new key name', async () => {
      await keychain.renameKey(rsaKeyName, renamedRsaKeyName)
      const key = await keychain.exportKey(renamedRsaKeyName)
      expect(key).to.exist()
    })

    it('removes the existing key name', async () => {
      await keychain.renameKey(rsaKeyName, renamedRsaKeyName)
      const exported = await keychain.exportKey(renamedRsaKeyName)
      expect(exported.toProtobuf()).to.equalBytes(privateKey.toProtobuf())

      // Try to find the changed key
      await expect(keychain.exportKey(rsaKeyName)).to.eventually.be.rejected()
    })

    it('throws with invalid key names', async () => {
      // @ts-expect-error invalid parameters
      await expect(keychain.renameKey(rsaKeyName, undefined)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })

  describe('key removal', () => {
    let keychain: Keychain

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })
    })

    it('cannot remove the "self" key', async () => {
      await expect(keychain.removeKey('self')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('can remove an unknown key', async () => {
      await keychain.removeKey('not-there')
    })

    it('can remove a known key', async () => {
      await keychain.removeKey(rsaKeyName)

      await expect(keychain.exportKey(rsaKeyName)).to.eventually.be.rejected
        .with.property('name', 'NotFoundError')
    })

    it('can read a public key from a protobuf', async () => {
      const key = await keychain.generateKey('my-key', {
        type: 'Ed25519'
      })

      const pb = key.publicKey.toProtobuf()
      const read = await keychain.loadPublicKeyFromProtobuf(pb)

      const message = Uint8Array.from([0, 1, 2, 3, 4])
      const sig = await key.sign(message)

      await expect(read.verify(message, sig)).to.eventually.be.true()
    })
  })

  describe('rotate keychain passphrase', () => {
    let oldPass: string
    let options: KeychainInit
    let keychain: Keychain

    beforeEach(async () => {
      oldPass = `hello-${Date.now()}-${Date.now()}`
      options = {
        password: oldPass,
        /* spell-checker:disable-next-line */
        salt: '3Nd/Ya4ENB3bcByNKptb4IR',
        iterations: 10000,
        hash: 'SHA-512'
      }

      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      }, options)
    })

    it('should validate newPass is a string', async () => {
      // @ts-expect-error invalid parameters
      await expect(keychain.rotateKeychainPass(1234567890)).to.eventually.be.rejected()
    })

    it('should validate newPass is at least 20 characters', async () => {
      try {
        await keychain.rotateKeychainPass('not20Chars')
      } catch (err: any) {
        expect(err).to.exist()
      }
    })

    it('can rotate keychain passphrase', async () => {
      const newPassword = 'newInsecurePassphrase'
      const keyName = 'test-key'
      const key = await keychain.generateKey(keyName)

      await keychain.rotateKeychainPass(newPassword)

      const key2 = await keychain.exportKey(keyName)
      expect(key2).to.deep.equal(key)

      // cannot load with old password
      const keychainWithOldPassword = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      }, options)

      await expect(keychainWithOldPassword.exportKey(keyName)).to.eventually.be.rejected
        .with.property('name', 'DecryptionFailedError')

      // new password should work
      const keychainWithNewPassword = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      }, {
        ...options,
        password: newPassword
      })

      await expect(keychainWithNewPassword.exportKey(keyName)).to.eventually.deep.equal(key)
    })
  })

  SUPPORTED_KEYS.forEach(type => {
    describe(`${type} keys`, () => {
      let keychain: Keychain

      beforeEach(async () => {
        keychain = new KeychainClass({
          datastore,
          getCrypto: getCrypto()
        })
      })

      const keyName = 'my custom key'

      it(`can create a ${type} key`, async () => {
        const privateKey = await keychain.generateKey(keyName, {
          type
        })

        expect(privateKey).to.be.ok()
        expect(privateKey).to.have.property('code').that.is.a('number')
        expect(privateKey).to.have.property('type', type)

        expect(isPrivateKey(privateKey)).to.be.true()
        expect(isPublicKey(privateKey.publicKey)).to.be.true()
      })

      it('can export/import a key', async () => {
        const privateKey = await keychain.generateKey(keyName, {
          type
        })

        const exportedKey = await keychain.exportKey(keyName)

        // remove it so we can re-import it
        await keychain.removeKey(keyName)
        const importedKey = await keychain.importKey(keyName, exportedKey)

        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const privateKeySig = await privateKey.sign(message)
        await expect(importedKey.publicKey.verify(message, privateKeySig)).to.eventually.be.true()

        const importedKeySig = await importedKey.sign(message)
        await expect(privateKey.publicKey.verify(message, importedKeySig)).to.eventually.be.true()
      })

      it('can sign and verify', async () => {
        const keyName = 'my-key'
        const privateKey = await keychain.generateKey(keyName, {
          type
        })
        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const sig = await privateKey.sign(message)

        await expect(privateKey.publicKey.verify(message, sig)).to.eventually.be.true()
      })

      it('can round-trip public key to protobuf', async () => {
        const keyName = 'my-key'
        const privateKey = await keychain.generateKey(keyName, {
          type
        })

        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const sig = await privateKey.sign(message)

        const pb = privateKey.publicKey.toProtobuf()
        const publicKey = await keychain.loadPublicKeyFromProtobuf(pb)

        await expect(publicKey.verify(message, sig)).to.eventually.be.true()
      })
    })
  })

  describe('Unsupported keys', () => {
    let keychain: Keychain

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })
    })

    const keyName = 'my custom un-configured key'

    it('does not support un-configured keys', async () => {
      await expect(keychain.generateKey(keyName, {
        type: 'un-configured'
      })).to.eventually.be.rejected()
    })
  })

  describe('@libp2p/keychain compatibility', () => {
    let keychain: Keychain
    let libp2pKeychain: Libp2pKeychain

    beforeEach(async () => {
      keychain = new KeychainClass({
        datastore,
        getCrypto: getCrypto()
      })

      libp2pKeychain = libp2pKeychainFactory()({
        // @ts-expect-error @libp2p/keychain needs new interface-datastore
        datastore,
        logger: defaultLogger()
      })
    })

    it('should read legacy RSA keys', async () => {
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFODBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQyqAoKIuPVEA+fAXV
W7szHgICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEDGe7rE974Z8
j+y0EWu6ROsEggTQyXsEAts6YOV718urpzXc/mX55ovj/+7ybWbvPzTbLnkuoF2k
UwEiADN42w5K1KJMifHUv/QoKfLKaCgrVqSGqQg1mh5zjedhiM+OZ4SSwEiZigea
SIaxR2jHQPbDdOox3241lGjZ5/bDdoLurdORcZfMshJP8nazTFNIowAcIKAHXDzc
YqLwD7bhSZ4v5r2eWatJ1SICUOzNlTwi6gUw9k7OfbPLacMcEfaogg7fzqazFsq1
ktWmJ+j0PEBq96SMx+Uwu0EsangEdobfHhTd62NTI86WSca8inMUQG2sV7k9jdac
+fiODdYDwGorgEIwDD6QjOdfhQwBoNj6LLUF+z/qAc9RaKnZFaHRDQ+pIOMF0qV/
dGUU6wW78W/pPf9voSmQFlsewXuxsuM5x3csYLmkxD71x5Rmatk3P6BsgimGSGP1
zr6EhX2tlpXbcFI4c4Ez4Ma1b2UEavD2mYU0qFHKbqu+JFKrUM9+LUPVHyvvuYdt
n2g8RCcJrrUB4sBuYqjnL6rKrOH9KZxPuWqjocH8Vbp2uBFPHA4OWHgzn3YNwGdF
5ncbIAaM+45bL9N33PGejikWkm35wk5ZpaVYk4+pQiZsvt72PmVAEgUPKsV4e851
1VCHyDEfynLmcd65ytnnez9drAqyWsZ2r7UNYYxEiEL5G5cx11/gAB+phFZyOWgt
cskjLjmlzBCWkIPKB9W48VbHiCPflaSwzLxWA9VqsmCp8c/lasQr291bAjHk2ESe
70BY5iEwhAxgjLlvXmelWW9OPydRGxqv9ROYS3AMYh1xydZVeUMwpHMEwEbV2F1y
wHtCeE4mDVeSypsy+eqQFqwA8xroDjKjNeQm++7jr0oCL22Y2d7jMZl1875znx1U
UjX+FvxW4MwnQS2eq5fJd5k6xd84eD/kpZyxfh01Q+iXo5TgsmLZwuDegGVuR0+q
OyW6IbaaNXMMnQRUg79SlBjpr7SETCfCtA/YKigBwD5E4qZXsr1JR1LwfiwCILV9
KrXF/hdf5WTfi+OZ6/NqVq8rK6UUuU9AfKEKxq7ddNKqChc9qIcGie2EhsHwbk0G
ZDQgCHIA40NTNVLxfad2AqBTXl2w6CVwKTZ+BHBiLsx9Uuca9gpSUxyGcR+5/vtz
+mYYeEoxF6kjhdkKEJ/qwzImSQPGMqaDzKuZPhVq7OkiQ39Abw9Bnd4k6lUEA9x0
vQmC9MmjmiHcneoWd4P9y7s/Ki8zaUGN3+/S9RA1DHgGvVyNydURDpjrOTjHxKqv
hCy47VqYcKjuiXQzQL2wqqYqQY/srC4cllvdbEnE49dzt8/ntTpZspovgYKIL8Gm
Z13dIlURtmWfu2trtiNALkoHxGLF8DK/GsNlqANw4ZpjSE/N/+28XXQbcoBG/MN1
VDkVFv7o2G46PZKLMr4BuU2NR50y52Uyuw0TXz6gIM9VWgkC7nobPVgLwsqTx6U3
zjCoqIlnnglhqgB8siYYkDY81LyoMJWC+2UXKyTQITJQlXsbmzlZkiJ10uLyCQid
ozhhbddK0+C0eCE7P2l87u378443UWY+SjI24dSfMDA4ShEFTzGfmt7gGP+syvyJ
KKQTc1G3fRDHjiuaVNNRLPQ3X9+BuStXSBpuHLSDmD8qeEAHidbp+Cbs9e0=
-----END ENCRYPTED PRIVATE KEY-----`

      const name = 'my-key'

      await datastore.put(new Key(`/pkcs8/${name}`), uint8ArrayFromString(pem))
      await datastore.put(new Key(`/info/${name}`), uint8ArrayFromString(JSON.stringify({
        name: 'my-key',
        id: 'QmXk8UCHxoKsW5xmuKx5JMn1TyNB9EWqWUe5smKXh6Hc6H'
      })))

      const key = await keychain.exportKey(name)

      expect(base58btc.encode(key.publicKey.toMultihash().bytes)).to.equal('zQmd9UpcusnJYWxWZvNPQ3FyCVJk1KjdfQcubypeEZDWcpd')
      expect(base58btc.encode((await sha256.digest(key.toProtobuf())).bytes)).to.equal('zQmXk8UCHxoKsW5xmuKx5JMn1TyNB9EWqWUe5smKXh6Hc6H')
    })

    SUPPORTED_KEYS.forEach(type => {
      it(`should read ${type} libp2p keychain keys`, async () => {
        const keyName = 'my-key'
        const libp2pPrivateKey = await generateKeyPair(type)
        await libp2pKeychain.importKey(keyName, libp2pPrivateKey)
        const heliaPrivateKey = await keychain.exportKey(keyName)

        const message = Uint8Array.from([0, 1, 2, 3, 4])

        const heliaSig = await heliaPrivateKey.sign(message)
        expect(await libp2pPrivateKey.publicKey.verify(message, heliaSig)).to.be.true()

        const libp2pSig = await libp2pPrivateKey.sign(message)
        expect(await heliaPrivateKey.publicKey.verify(message, libp2pSig)).to.be.true()
      })

      it(`should write ${type} libp2p keychain keys`, async () => {
        const keyName = 'my-key'
        const heliaPrivateKey = await keychain.generateKey(keyName, {
          type
        })
        const libp2pPrivateKey = await libp2pKeychain.exportKey(keyName)

        const message = Uint8Array.from([0, 1, 2, 3, 4])

        const heliaSig = await heliaPrivateKey.sign(message)
        expect(await libp2pPrivateKey.publicKey.verify(message, heliaSig)).to.be.true()

        const libp2pSig = await libp2pPrivateKey.sign(message)
        expect(await heliaPrivateKey.publicKey.verify(message, libp2pSig)).to.be.true()
      })
    })
  })
})
