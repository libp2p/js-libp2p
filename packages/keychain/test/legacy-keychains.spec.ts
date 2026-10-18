import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Keychain } from '../src/keychain.ts'
import { legacyKeychains } from './fixtures/legacy-keychains.ts'
import type { LegacyKeychain } from './fixtures/legacy-keychains.ts'

async function openKeychain (fixture: LegacyKeychain): Promise<Keychain> {
  const datastore = new MemoryDatastore()

  for (const [key, value] of Object.entries(fixture.entries)) {
    await datastore.put(new Key(key), uint8ArrayFromString(value))
  }

  return new Keychain({ datastore, logger: defaultLogger() }, fixture.init)
}

describe('legacy keychains', () => {
  for (const fixture of legacyKeychains) {
    describe(fixture.name, () => {
      it('lists the stored keys', async () => {
        const keychain = await openKeychain(fixture)
        const keys = await keychain.listKeys()

        expect(keys.map(({ name, id }) => ({ name, id })).sort((a, b) => a.name.localeCompare(b.name)))
          .to.deep.equal(fixture.keys.map(({ name, id }) => ({ name, id })).sort((a, b) => a.name.localeCompare(b.name)))
      })

      for (const expected of fixture.keys) {
        it(`exports the ${expected.type} key`, async () => {
          const keychain = await openKeychain(fixture)
          const key = await keychain.exportKey(expected.name)
          const data = uint8ArrayFromString('hello world')

          expect(key.type).to.equal(expected.type)
          expect(uint8ArrayToString(publicKeyToProtobuf(key.publicKey), 'base64')).to.equal(expected.publicKey)
          expect(await key.publicKey.verify(data, await key.sign(data))).to.be.true()
        })
      }
    })
  }
})
