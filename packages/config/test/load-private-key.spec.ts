import { generateKeyPair } from '@libp2p/crypto/keys'
import { keychain } from '@libp2p/keychain'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { loadOrCreateSelfKey } from '../src/index.js'

describe('load-private-key', () => {
  it('should load a private key', async () => {
    const datastore = new MemoryDatastore()
    const chain = keychain({})({
      datastore,
      logger: defaultLogger()
    })
    const key = await generateKeyPair('secp256k1')
    await chain.importKey('self', key)

    const loaded = await loadOrCreateSelfKey(datastore)

    expect(loaded).to.deep.equal(key)
  })

  it('should create a private key', async () => {
    const datastore = new MemoryDatastore()
    const loaded = await loadOrCreateSelfKey(datastore)

    expect(loaded).to.have.property('type', 'Ed25519')
  })
})
