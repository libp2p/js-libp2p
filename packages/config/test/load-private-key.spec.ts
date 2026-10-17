import { createCryptoLoader, defaultCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { keychain } from '@libp2p/keychain'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { Key } from 'interface-datastore'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { loadOrCreateSelfKey } from '../src/index.ts'
import { legacySelfKey } from './fixtures/legacy-keychain.ts'

describe('load-private-key', () => {
  it('should load a private key', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])
    const datastore = new MemoryDatastore()
    const chain = keychain({})({
      datastore,
      getCrypto
    })
    const key = await generateKeyPair('secp256k1', { getCrypto })
    await chain.importKey('self', key)

    const loaded = await loadOrCreateSelfKey(datastore, { getCrypto })

    expect(loaded.type).to.equal('secp256k1')
    expect(uint8ArrayEquals(loaded.toProtobuf(), key.toProtobuf())).to.be.true()
  })

  it('should load a private key with a different name', async () => {
    const selfKey = 'my-key'
    const datastore = new MemoryDatastore()
    const chain = keychain({
      selfKey
    })({
      datastore,
      getCrypto: defaultCryptoLoader()
    })
    const key = await generateKeyPair('Ed25519')
    await chain.importKey(selfKey, key)

    const loaded = await loadOrCreateSelfKey(datastore, {
      selfKey
    })

    expect(uint8ArrayEquals(loaded.toProtobuf(), key.toProtobuf())).to.be.true()
  })

  it('should create a private key', async () => {
    const datastore = new MemoryDatastore()
    const loaded = await loadOrCreateSelfKey(datastore)

    expect(loaded).to.have.property('type', 'Ed25519')
  })

  it('should return the same key after creating one', async () => {
    const datastore = new MemoryDatastore()
    const created = await loadOrCreateSelfKey(datastore)
    const loaded = await loadOrCreateSelfKey(datastore)

    expect(uint8ArrayEquals(loaded.toProtobuf(), created.toProtobuf())).to.be.true()
  })

  it('should load the self key from a legacy keychain without a password', async () => {
    const datastore = new MemoryDatastore()

    for (const [key, value] of Object.entries(legacySelfKey.entries)) {
      await datastore.put(new Key(key), uint8ArrayFromString(value))
    }

    const loaded = await loadOrCreateSelfKey(datastore)
    expect(loaded.type).to.equal(legacySelfKey.type)
    expect(uint8ArrayToString(loaded.publicKey.toProtobuf(), 'base64')).to.equal(legacySelfKey.publicKey)
  })
})
