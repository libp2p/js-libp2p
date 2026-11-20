import { expect } from 'aegir/chai'
import { entries, expectKeys, load, open } from './fixtures/helpers.ts'
import { legacyKeychains } from './fixtures/legacy-keychains.ts'

const WRONG_PASS = 'this is the wrong keychain password'

describe('legacy keychains', () => {
  for (const fixture of legacyKeychains) {
    describe(fixture.name, () => {
      it('reads every key', async () => {
        await expectKeys(open(await load(fixture), fixture), fixture)
      })

      it('reads every key again after reopening', async () => {
        const datastore = await load(fixture)

        await expectKeys(open(datastore, fixture), fixture)
        await expectKeys(open(datastore, fixture), fixture)
      })

      it('rejects the wrong password without changing stored keys', async () => {
        const datastore = await load(fixture)
        const wrong = open(datastore, fixture, { password: fixture.init.pass == null ? WRONG_PASS : `${fixture.init.pass} but wrong` })

        for (const expected of fixture.keys) {
          await expect(wrong.exportKey(expected.name)).to.eventually.be.rejected.with.property('name', 'KeychainMigrationError')
        }

        expect(await entries(datastore)).to.deep.equal(fixture.entries)

        await expectKeys(open(datastore, fixture), fixture)
      })
    })
  }
})
