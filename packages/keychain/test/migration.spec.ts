import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import all from 'it-all'
import sinon from 'sinon'
import { entries, expectKeys, load, open } from './fixtures/helpers.ts'
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
    await datastore.put(new Key('/pkcs8/self'), await migrated.get(new Key('/pkcs8/self')))

    await expectKeys(open(datastore, withPassword), withPassword)
    expect(await entries(datastore)).to.have.property('/keychain/meta')
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

    await expect(keychain.exportKey('self', { signal: AbortSignal.abort() })).to.eventually.be.rejected.with.property('name', 'AbortError')
    await expectKeys(keychain, withPassword)
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

  it('rotates the password of a legacy store', async () => {
    const datastore = await load(withPassword)
    const newPassword = 'a brand new keychain password'

    await open(datastore, withPassword).rotateKeychainPass(newPassword)
    await expectKeys(open(datastore, withPassword, { password: newPassword }), withPassword)
  })
})
