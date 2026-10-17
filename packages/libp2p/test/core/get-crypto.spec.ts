import { createCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.ts'
import type { Libp2p } from '@libp2p/interface'

describe('getCrypto', () => {
  let node: Libp2p | undefined

  afterEach(async () => {
    await node?.stop()
  })

  it('loads the default cryptos', async () => {
    node = await createLibp2p({ start: false })

    expect((await node.getCrypto('Ed25519')).code).to.equal(1)
    await expect(node.getCrypto('secp256k1')).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
  })

  it('adds configured cryptos', async () => {
    node = await createLibp2p({ start: false, cryptos: [secp256k1Crypto()] })

    expect((await node.getCrypto('secp256k1')).code).to.equal(2)
  })

  it('shares the loader with services', async () => {
    let seen: unknown
    node = await createLibp2p({
      start: false,
      services: {
        probe: (components: any) => {
          seen = components.getCrypto
          return {}
        }
      }
    })

    expect(seen).to.equal(node.getCrypto)
  })

  describe('getPublicKey', () => {
    it('returns keys of configured cryptos', async () => {
      const privateKey = await generateKeyPair('secp256k1', { getCrypto: createCryptoLoader([secp256k1Crypto()]) })
      const peerId = peerIdFromPrivateKey(privateKey)

      node = await createLibp2p({ start: false, cryptos: [secp256k1Crypto()] })

      const key = await node.getPublicKey(peerId)
      expect(key.type).to.equal('secp256k1')
      expect(key.toProtobuf()).to.equalBytes(peerId.publicKey)
    })

    it('rejects keys of unconfigured cryptos', async () => {
      const privateKey = await generateKeyPair('secp256k1', { getCrypto: createCryptoLoader([secp256k1Crypto()]) })
      const peerId = peerIdFromPrivateKey(privateKey)

      node = await createLibp2p({ start: false })

      await expect(node.getPublicKey(peerId)).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
    })
  })
})
