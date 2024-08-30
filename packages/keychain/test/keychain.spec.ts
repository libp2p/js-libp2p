/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */

import { pbkdf2 } from '@libp2p/crypto'
import { generateKeyPair, importPrivateKey } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Keychain as KeychainClass } from '../src/keychain.js'
import type { KeychainInit, Keychain, KeyInfo } from '../src/index.js'
import type { PrivateKey } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

describe('keychain', () => {
  const passPhrase = 'this is not a secure phrase'
  const rsaKeyName = 'tajné jméno'
  const renamedRsaKeyName = 'ชื่อลับ'
  const logger = defaultLogger()
  let rsaKeyInfo: KeyInfo
  let ks: Keychain
  let datastore2: Datastore

  before(async () => {
    datastore2 = new MemoryDatastore()

    ks = new KeychainClass({
      datastore: datastore2,
      logger
    }, { pass: passPhrase })
  })

  it('can start without a password', async () => {
    await expect(async function () {
      return new KeychainClass({
        datastore: datastore2,
        logger
      }, {})
    }()).to.eventually.be.ok()
  })

  it('needs a NIST SP 800-132 non-weak pass phrase', async () => {
    await expect(async function () {
      return new KeychainClass({
        datastore: datastore2,
        logger
      }, { pass: '< 20 character' })
    }()).to.eventually.be.rejected()
  })

  it('has default options', () => {
    expect(KeychainClass.options).to.exist()
  })

  it('supports supported hashing alorithms', async () => {
    const ok = new KeychainClass({
      datastore: datastore2,
      logger
    }, { pass: passPhrase, dek: { hash: 'sha2-256', salt: 'salt-salt-salt-salt', iterationCount: 1000, keyLength: 14 } })
    expect(ok).to.exist()
  })

  it('does not support unsupported hashing alorithms', async () => {
    await expect(async function () {
      return new KeychainClass({
        datastore: datastore2,
        logger
      }, { pass: passPhrase, dek: { hash: 'my-hash', salt: 'salt-salt-salt-salt', iterationCount: 1000, keyLength: 14 } })
    }()).to.eventually.be.rejected()
  })

  it('can list keys without a password', async () => {
    const keychain = new KeychainClass({
      datastore: datastore2,
      logger
    }, {})

    expect(await keychain.listKeys()).to.have.lengthOf(0)
  })

  it('can find a key without a password', async () => {
    const keychain = new KeychainClass({
      datastore: datastore2,
      logger
    }, {})
    const keychainWithPassword = new KeychainClass({
      datastore: datastore2,
      logger
    }, { pass: `hello-${Date.now()}-${Date.now()}` })
    const name = `key-${Math.random()}`

    const key = await generateKeyPair('Ed25519')
    await keychainWithPassword.importKey(name, key)

    await expect(keychain.findKeyByName(name)).to.eventually.be.ok()
  })

  it('can remove a key without a password', async () => {
    const keychainWithoutPassword = new KeychainClass({
      datastore: datastore2,
      logger
    }, {})
    const keychainWithPassword = new KeychainClass({
      datastore: datastore2,
      logger
    }, { pass: `hello-${Date.now()}-${Date.now()}` })
    const name = `key-${Math.random()}`

    const key = await generateKeyPair('Ed25519')
    await keychainWithPassword.importKey(name, key)

    expect(await keychainWithoutPassword.findKeyByName(name)).to.have.property('name', name)
    await keychainWithoutPassword.removeKey(name)
    await expect(keychainWithoutPassword.findKeyByName(name)).to.be.rejectedWith(/does not exist/)
  })

  it('can generate options', async () => {
    const options = KeychainClass.generateOptions()
    options.pass = passPhrase
    const chain = new KeychainClass({
      datastore: datastore2,
      logger
    }, options)
    expect(chain).to.exist()
  })

  describe('key name', () => {
    it('is a valid filename and non-ASCII', async () => {
      const errors = await Promise.all([
        ks.removeKey('../../nasty').catch(err => err),
        ks.removeKey('').catch(err => err),
        ks.removeKey('    ').catch(err => err),
        // @ts-expect-error invalid parameters
        ks.removeKey(null).catch(err => err),
        // @ts-expect-error invalid parameters
        ks.removeKey(undefined).catch(err => err)
      ])

      expect(errors).to.have.length(5)
      errors.forEach(error => {
        expect(error).to.have.property('name', 'InvalidParametersError')
      })
    })
  })

  describe('Ed25519 keys', () => {
    const keyName = 'my custom key'

    it('can be an Ed25519 key', async () => {
      const key = await generateKeyPair('Ed25519')
      const keyInfo = await ks.importKey(keyName, key)

      expect(keyInfo).to.exist()
      expect(keyInfo).to.have.property('name', keyName)
      expect(keyInfo).to.have.property('id')
    })

    it('does not overwrite existing key', async () => {
      const key = await generateKeyPair('Ed25519')

      await expect(ks.importKey(keyName, key)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('can export/import a key', async () => {
      const keyName = 'a new key'
      const key = await generateKeyPair('Ed25519')
      const keyInfo = await ks.importKey(keyName, key)
      const exportedKey = await ks.exportKey(keyName)
      // remove it so we can re-import it
      await ks.removeKey(keyName)
      const importedKey = await ks.importKey(keyName, exportedKey)
      expect(importedKey.id).to.eql(keyInfo.id)
    })

    it('cannot create the "self" key', async () => {
      const key = await generateKeyPair('Ed25519')

      await expect(ks.importKey('self', key)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })

  describe('query', () => {
    before(async () => {
      const key = await generateKeyPair('RSA')
      await ks.importKey(rsaKeyName, key)

      rsaKeyInfo = await ks.findKeyByName(rsaKeyName)
    })

    it('finds all existing keys', async () => {
      const keys = await ks.listKeys()
      expect(keys).to.exist()
      const mykey = keys.find((k) => k.name.normalize() === rsaKeyName.normalize())
      expect(mykey).to.exist()
    })

    it('finds a key by name', async () => {
      const key = await ks.findKeyByName(rsaKeyName)
      expect(key).to.exist()
      expect(key).to.deep.equal(rsaKeyInfo)
    })

    it('finds a key by id', async () => {
      const key = await ks.findKeyById(rsaKeyInfo.id)
      expect(key).to.exist()
      expect(key).to.deep.equal(rsaKeyInfo)
    })

    it('returns the key\'s name and id', async () => {
      const keys = await ks.listKeys()
      expect(keys).to.exist()
      keys.forEach((key) => {
        expect(key).to.have.property('name')
        expect(key).to.have.property('id')
      })
    })
  })

  describe('exported key', () => {
    let key: PrivateKey

    it('requires the key name', async () => {
      // @ts-expect-error invalid parameters
      await expect(ks.exportKey(undefined, 'password')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('is a PKCS #8 encrypted pem', async () => {
      key = await ks.exportKey(rsaKeyName)
      expect(key).to.be.ok()
    })

    it('can be imported', async () => {
      const keyInfo = await ks.importKey('imported-key', key)
      expect(keyInfo.name).to.equal('imported-key')
      expect(keyInfo.id).to.equal(rsaKeyInfo.id)
    })

    it('requires the key', async () => {
      // @ts-expect-error invalid parameters
      await expect(ks.importKey('imported-key', undefined)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('cannot be imported as an existing key name', async () => {
      await expect(ks.importKey(rsaKeyName, key)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })

  describe('rename', () => {
    it('requires an existing key name', async () => {
      await expect(ks.renameKey('not-there', renamedRsaKeyName)).to.eventually.be.rejected
        .with.property('name', 'NotFoundError')
    })

    it('requires a valid new key name', async () => {
      await expect(ks.renameKey(rsaKeyName, '..\not-valid')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('does not overwrite existing key', async () => {
      await expect(ks.renameKey(rsaKeyName, rsaKeyName)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('cannot create the "self" key', async () => {
      await expect(ks.renameKey(rsaKeyName, 'self')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('removes the existing key name', async () => {
      const key = await ks.renameKey(rsaKeyName, renamedRsaKeyName)
      expect(key).to.exist()
      expect(key).to.have.property('name', renamedRsaKeyName)
      expect(key).to.have.property('id', rsaKeyInfo.id)
      // Try to find the changed key
      await expect(ks.findKeyByName(rsaKeyName)).to.eventually.be.rejected()
    })

    it('creates the new key name', async () => {
      const key = await ks.findKeyByName(renamedRsaKeyName)
      expect(key).to.exist()
      expect(key).to.have.property('name', renamedRsaKeyName)
    })

    it('does not change the key ID', async () => {
      const key = await ks.findKeyByName(renamedRsaKeyName)
      expect(key).to.exist()
      expect(key).to.have.property('name', renamedRsaKeyName)
      expect(key).to.have.property('id', rsaKeyInfo.id)
    })

    it('throws with invalid key names', async () => {
      // @ts-expect-error invalid parameters
      await expect(ks.findKeyByName(undefined)).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })

  describe('key removal', () => {
    it('cannot remove the "self" key', async () => {
      await expect(ks.removeKey('self')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })

    it('cannot remove an unknown key', async () => {
      await expect(ks.removeKey('not-there')).to.eventually.be.rejected
        .with.property('name', 'NotFoundError')
    })

    it('can remove a known key', async () => {
      const key = await ks.removeKey(renamedRsaKeyName)
      expect(key).to.exist()
      expect(key).to.have.property('name', renamedRsaKeyName)
      expect(key).to.have.property('id', rsaKeyInfo.id)
    })
  })

  describe('rotate keychain passphrase', () => {
    let oldPass: string
    let kc: Keychain
    let options: KeychainInit
    let ds: Datastore
    before(async () => {
      ds = new MemoryDatastore()
      oldPass = `hello-${Date.now()}-${Date.now()}`
      options = {
        pass: oldPass,
        dek: {
          salt: '3Nd/Ya4ENB3bcByNKptb4IR',
          iterationCount: 10000,
          keyLength: 64,
          hash: 'sha2-512'
        }
      }
      kc = new KeychainClass({
        datastore: ds,
        logger
      }, options)
    })

    it('should validate newPass is a string', async () => {
      // @ts-expect-error invalid parameters
      await expect(kc.rotateKeychainPass(oldPass, 1234567890)).to.eventually.be.rejected()
    })

    it('should validate oldPass is a string', async () => {
      // @ts-expect-error invalid parameters
      await expect(kc.rotateKeychainPass(1234, 'newInsecurePassword1')).to.eventually.be.rejected()
    })

    it('should validate newPass is at least 20 characters', async () => {
      try {
        await kc.rotateKeychainPass(oldPass, 'not20Chars')
      } catch (err: any) {
        expect(err).to.exist()
      }
    })

    it('can rotate keychain passphrase', async () => {
      const key = await generateKeyPair('RSA', 2048)
      await kc.importKey('keyCreatedWithOldPassword', key)

      await kc.rotateKeychainPass(oldPass, 'newInsecurePassphrase')

      // Get Key PEM from datastore
      const dsname = new Key('/pkcs8/' + 'keyCreatedWithOldPassword')
      const res = await ds.get(dsname)
      const pem = uint8ArrayToString(res)

      const oldDek = options.pass != null
        ? pbkdf2(
          options.pass,
          options.dek?.salt ?? 'salt',
          options.dek?.iterationCount ?? 0,
          options.dek?.keyLength ?? 0,
          options.dek?.hash ?? 'sha2-256'
        )
        : ''

      const newDek = pbkdf2(
        'newInsecurePassphrase',
        options.dek?.salt ?? 'salt',
        options.dek?.iterationCount ?? 0,
        options.dek?.keyLength ?? 0,
        options.dek?.hash ?? 'sha2-256'
      )

      // Dek with old password should not work:
      await expect(importPrivateKey(pem, oldDek))
        .to.eventually.be.rejected()

      // Dek with new password should work:
      await expect(importPrivateKey(pem, newDek))
        .to.eventually.have.property('type', 'RSA')
    }).timeout(10000)
  })

  it('needs a passphrase to be used, otherwise throws an error', async () => {
    expect(() => {
      return new KeychainClass({
        datastore: new MemoryDatastore(),
        logger
      }, {
        pass: ''
      })
    }).to.throw()
  })

  it('can be used when a passphrase is provided', async () => {
    const keychain = new KeychainClass({
      datastore: new MemoryDatastore(),
      logger
    }, {
      pass: '12345678901234567890'
    })

    const key = await generateKeyPair('Ed25519')
    const kInfo = await keychain.importKey('keyName', key)
    expect(kInfo).to.exist()
  })

  it('can reload keys', async () => {
    const datastore = new MemoryDatastore()
    const keychain = new KeychainClass({
      datastore,
      logger
    }, {
      pass: '12345678901234567890'
    })

    const key = await generateKeyPair('Ed25519')
    const kInfo = await keychain.importKey('keyName', key)
    expect(kInfo).to.exist()

    const keychain2 = new KeychainClass({
      datastore,
      logger
    }, {
      pass: '12345678901234567890'
    })

    const key2 = await keychain2.findKeyByName('keyName')

    expect(key2).to.exist()
  })
})
