import { ed25519Crypto } from '@libp2p/crypto'
import { isPrivateKey, isPublicKey } from '@libp2p/crypto'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import all from 'it-all'
import { isKeychain, keychain } from '../src/index.ts'
import { Keychain as KeychainClass } from '../src/keychain.ts'
import { getCrypto } from './fixtures/get-crypto.ts'
import type { Keychain } from '../src/index.ts'
import type { KeychainInit } from '../src/index.ts'
import type { PrivateKey } from '@libp2p/crypto'
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

  it('is a keychain', () => {
    expect(isKeychain(keychain()({ datastore, getCrypto: getCrypto() }))).to.be.true()
  })

  it('should not be a keychain', () => {
    expect(isKeychain()).to.be.false()
    expect(isKeychain({})).to.be.false()
    expect(isKeychain(true)).to.be.false()
    expect(isKeychain({
      findKeyById: () => {},
      findKeyByName: () => {},
      importKey: () => {},
      exportKey: () => {},
      removeKey: () => {},
      renameKey: () => {},
      listKeys: () => {},
      rotateKeychainPass: () => {}
    })).to.be.false()
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
})
