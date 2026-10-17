import { createCryptoLoader } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import all from 'it-all'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Keychain } from '../../src/keychain.ts'
import type { LegacyKeychain } from './legacy-keychains.ts'
import type { KeychainInit, KeyInfo } from '../../src/index.ts'
import type { LegacyDek } from '../../src/legacy.ts'
import type { Datastore } from 'interface-datastore'

export async function load (fixture: LegacyKeychain): Promise<Datastore> {
  const datastore = new MemoryDatastore()

  for (const [key, value] of Object.entries(fixture.entries)) {
    await datastore.put(new Key(key), uint8ArrayFromString(value))
  }

  return datastore
}

export async function entries (datastore: Datastore): Promise<Record<string, string>> {
  const out: Record<string, string> = {}

  for await (const { key, value } of datastore.query({})) {
    out[key.toString()] = uint8ArrayToString(value)
  }

  return out
}

/**
 * Maps the options a fixture was written with onto the current ones
 */
function toInit (fixture: LegacyKeychain): KeychainInit {
  const dek = fixture.init.dek

  return {
    password: fixture.init.pass,
    salt: dek?.salt,
    iterations: dek?.iterationCount,
    legacyDek: dek == null ? undefined : { keyLength: dek.keyLength, hash: dek.hash as LegacyDek['hash'] }
  }
}

export function open (datastore: Datastore, fixture: LegacyKeychain, overrides: KeychainInit = {}): Keychain {
  return new Keychain({ datastore, getCrypto: createCryptoLoader([secp256k1Crypto()]) }, { ...toInit(fixture), ...overrides })
}

function byName (keys: Array<Pick<KeyInfo, 'name' | 'id'>>): Array<Pick<KeyInfo, 'name' | 'id'>> {
  return keys.map(({ name, id }) => ({ name, id })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function expectKeys (keychain: Keychain, fixture: LegacyKeychain): Promise<void> {
  expect(byName(await all(keychain.listKeys()))).to.deep.equal(byName(fixture.keys))

  for (const expected of fixture.keys) {
    const key = await keychain.exportKey(expected.name)
    const data = uint8ArrayFromString('hello world')

    expect(key.type).to.equal(expected.type)
    expect(uint8ArrayToString(key.publicKey.toProtobuf(), 'base64')).to.equal(expected.publicKey)
    expect(await key.publicKey.verify(data, await key.sign(data))).to.be.true()
  }
}
