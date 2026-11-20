import { createCryptoLoader } from '@libp2p/crypto'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import all from 'it-all'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { encryptEntry } from '../src/cipher.ts'
import { Keychain } from '../src/keychain.ts'
import { entries, expectKeys, load, notRsaFor, open, reencryptPem } from './fixtures/helpers.ts'
import { legacyKeychains } from './fixtures/legacy-keychains.ts'

describe('keychain migration', () => {
  const [noPassword, withPassword, customDek] = legacyKeychains

  afterEach(() => { sinon.restore() })

  it('rewrites every entry and writes meta', async () => {
    const datastore = await load(withPassword)
    await all(open(datastore, withPassword).listKeys())
    const after = await entries(datastore)

    expect(JSON.parse(after['/keychain/meta'])).to.deep.equal({ version: 2 })

    for (const [key, value] of Object.entries(withPassword.entries)) {
      if (key.startsWith('/info/')) {
        expect(after[key]).to.equal(value)
      }

      if (key.startsWith('/pkcs8/')) {
        expect(after[key]).to.not.equal(value)
        expect(after[key]).to.not.include('BEGIN ENCRYPTED PRIVATE KEY')
      }
    }
  })

  it('only rewrites PEM entries without a password', async () => {
    const datastore = await load(noPassword)
    await all(open(datastore, noPassword).listKeys())
    const after = await entries(datastore)

    expect(after['/pkcs8/self']).to.equal(noPassword.entries['/pkcs8/self'])
    expect(after['/pkcs8/rsa-key']).to.not.include('BEGIN ENCRYPTED PRIVATE KEY')
  })

  it('does no writes on a second open', async () => {
    const datastore = await load(withPassword)
    await all(open(datastore, withPassword).listKeys())
    const put = sinon.spy(datastore, 'put')
    const batch = sinon.spy(datastore, 'batch')

    await expectKeys(open(datastore, withPassword), withPassword)
    expect(put.called).to.be.false()
    expect(batch.called).to.be.false()
  })

  it('resumes an interrupted migration', async () => {
    const datastore = await load(withPassword)
    const migrated = await load(withPassword)
    await all(open(migrated, withPassword).listKeys())

    // one entry rewritten, the rest legacy, no meta
    const self = await migrated.get(new Key('/pkcs8/self'))
    await datastore.put(new Key('/pkcs8/self'), self)

    await expectKeys(open(datastore, withPassword), withPassword)
    expect(await entries(datastore)).to.have.property('/keychain/meta')
    expect(await datastore.get(new Key('/pkcs8/self'))).to.equalBytes(self)
  })

  it('migrates a keychain with a customized dek', async () => {
    await expectKeys(open(await load(customDek), customDek), customDek)
  })

  it('shares one migration between concurrent calls', async () => {
    const datastore = await load(withPassword)
    const keychain = open(datastore, withPassword)
    const batch = sinon.spy(datastore, 'batch')

    await Promise.all([keychain.exportKey('self'), keychain.exportKey('rsa-key'), all(keychain.listKeys())])
    expect(batch.callCount).to.equal(1)
  })

  it('two instances on one datastore', async () => {
    const datastore = await load(withPassword)

    await Promise.all([all(open(datastore, withPassword).listKeys()), all(open(datastore, withPassword).listKeys())])
    await expectKeys(open(datastore, withPassword), withPassword)
  })

  it('an aborted caller does not cancel the migration', async () => {
    const datastore = await load(withPassword)
    const keychain = open(datastore, withPassword)
    const batch = sinon.spy(datastore, 'batch')

    await expect(keychain.exportKey('self', { signal: AbortSignal.abort() })).to.eventually.be.rejected.with.property('name', 'AbortError')
    await expectKeys(keychain, withPassword)
    expect(batch.callCount).to.equal(1)
  })

  it('renames and removes keys on a legacy store', async () => {
    const datastore = await load(withPassword)
    const keychain = open(datastore, withPassword)

    await keychain.renameKey('rsa-key', 'renamed')
    await keychain.removeKey('ecdsa-key')
    const names = (await all(keychain.listKeys())).map(k => k.name)

    expect(names).to.include('renamed').and.not.include('rsa-key').and.not.include('ecdsa-key')
    expect((await keychain.exportKey('renamed')).type).to.equal('RSA')
  })

  it('opens an empty store and writes meta', async () => {
    const datastore = new MemoryDatastore()
    await all(open(datastore, withPassword).listKeys())

    expect(Object.keys(await entries(datastore))).to.deep.equal(['/keychain/meta'])
  })

  it('leaves a PEM-only store untouched when a PEM decrypts to a non-RSA key', async () => {
    const pem = withPassword.entries['/pkcs8/rsa-key']
    const datastore = await load({
      ...withPassword,
      entries: {
        '/pkcs8/rsa-key': await reencryptPem(withPassword.derivedDek ?? '', pem, notRsaFor(pem)),
        '/info/rsa-key': withPassword.entries['/info/rsa-key']
      }
    })
    const before = await entries(datastore)

    await expect(all(open(datastore, withPassword).listKeys())).to.eventually.be.rejected.with.property('name', 'KeychainMigrationError')
    expect(await entries(datastore)).to.deep.equal(before)
  })

  it('does not migrate an entry that decrypts to something that is not a key', async () => {
    const datastore = await load(withPassword)
    // authenticates under the legacy dek but is a key protobuf without a type
    const bogus = await encryptEntry(withPassword.derivedDek ?? '', Uint8Array.from([0x12, 0x03, 0x01, 0x02, 0x03]))
    await datastore.put(new Key('/pkcs8/bogus'), uint8ArrayFromString(bogus))
    const before = await entries(datastore)

    await expect(all(open(datastore, withPassword).listKeys())).to.eventually.be.rejected.with.property('name', 'KeychainMigrationError')
    expect(await entries(datastore)).to.deep.equal(before)
  })

  it('migrates keys whose type is not configured', async () => {
    const datastore = await load(withPassword)
    const keychain = new Keychain({ datastore, getCrypto: createCryptoLoader() }, { password: withPassword.init.pass })

    expect(withPassword.keys.map(k => k.name)).to.include('secp256k1-key')
    expect((await all(keychain.listKeys())).map(k => k.name)).to.have.members(withPassword.keys.map(k => k.name))

    const after = await entries(datastore)
    expect(after).to.have.property('/keychain/meta')

    for (const [key, value] of Object.entries(withPassword.entries)) {
      if (key.startsWith('/pkcs8/')) {
        expect(after[key]).to.not.equal(value)
      }
    }

    for (const expected of withPassword.keys) {
      if (expected.type === 'secp256k1') {
        await expect(keychain.exportKey(expected.name)).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
        continue
      }

      const key = await keychain.exportKey(expected.name)
      const data = uint8ArrayFromString('hello world')

      expect(key.type).to.equal(expected.type)
      expect(await key.publicKey.verify(data, await key.sign(data))).to.be.true()
    }

    await expectKeys(open(datastore, withPassword), withPassword)
  })

  it('rotates the password of a legacy store', async () => {
    const datastore = await load(withPassword)
    const newPassword = 'a brand new keychain password'

    await open(datastore, withPassword).rotateKeychainPass(newPassword)
    await expectKeys(open(datastore, withPassword, { password: newPassword }), withPassword)
  })
})
