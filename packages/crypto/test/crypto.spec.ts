import { generateKeyPair, privateKeyFromProtobuf, privateKeyToProtobuf } from '@libp2p/crypto/keys'
import { expect } from 'aegir/chai'
import { ecdsaCrypto } from '../src/ecdsa.ts'
import { ed25519Crypto } from '../src/index.ts'
import { isPrivateKey, isPublicKey, rsaCrypto } from '../src/index.ts'
import type { Crypto, PrivateKey } from '../src/index.ts'
import type { PrivateKey as Libp2pPrivateKey } from '@libp2p/interface'

interface CryptoKey {
  type: string
  getImplementation(): Crypto
  generateKey(): Promise<PrivateKey>
  generateLibp2pKey(): Promise<Libp2pPrivateKey>
}

const SUPPORTED_KEYS: CryptoKey[] = [{
  type: 'Ed25519',
  getImplementation: ed25519Crypto,
  generateKey: () => {
    return ed25519Crypto().generatePrivateKey()
  },
  generateLibp2pKey () {
    return generateKeyPair('Ed25519')
  }
}, {
  type: 'RSA',
  getImplementation: rsaCrypto,
  generateKey: () => {
    return rsaCrypto().generatePrivateKey()
  },
  generateLibp2pKey () {
    return generateKeyPair('RSA')
  }
}, {
  type: 'ECDSA',
  getImplementation: ecdsaCrypto,
  generateKey: () => {
    return ecdsaCrypto().generatePrivateKey()
  },
  generateLibp2pKey () {
    return generateKeyPair('ECDSA')
  }
}]

describe('crypto', () => {
  SUPPORTED_KEYS.forEach(key => {
    describe(`${key.type} keys`, () => {
      it(`can create a ${key.type} key`, async () => {
        const privateKey = await key.generateKey()

        expect(privateKey).to.be.ok()
        expect(privateKey).to.have.property('code').that.is.a('number')
        expect(privateKey).to.have.property('type', key.type)

        expect(isPrivateKey(privateKey)).to.be.true()
        expect(isPublicKey(privateKey.publicKey)).to.be.true()
      })

      it('can sign and verify', async () => {
        const privateKey = await key.generateKey()
        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const sig = await privateKey.sign(message)

        await expect(privateKey.publicKey.verify(message, sig)).to.eventually.be.true()
      })

      it('can round-trip public key to protobuf', async () => {
        const privateKey = await key.generateKey()

        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const sig = await privateKey.sign(message)

        const pb = privateKey.publicKey.toProtobuf()
        const publicKey = await key.getImplementation().publicKeyFromProtobuf(pb)

        await expect(publicKey.verify(message, sig)).to.eventually.be.true()
      })

      it('can round-trip private key to protobuf', async () => {
        const privateKey = await key.generateKey()

        const message = Uint8Array.from([0, 1, 2, 3, 4])
        const sig = await privateKey.sign(message)

        const pb = privateKey.toProtobuf()
        const deserializedPrivateKey = await key.getImplementation().privateKeyFromProtobuf(pb)

        await expect(deserializedPrivateKey.publicKey.verify(message, sig)).to.eventually.be.true()
      })
    })
  })

  describe('@libp2p/crypto compatibility', () => {
    SUPPORTED_KEYS.forEach(key => {
      it(`Helia keys should be compatible with ${key.type} libp2p keys`, async () => {
        const libp2pPrivateKey = await key.generateLibp2pKey()
        const pb = privateKeyToProtobuf(libp2pPrivateKey)
        const heliaPrivateKey = await key.getImplementation().privateKeyFromProtobuf(pb)

        const message = Uint8Array.from([0, 1, 2, 3, 4])

        const heliaSig = await heliaPrivateKey.sign(message)
        expect(await libp2pPrivateKey.publicKey.verify(message, heliaSig)).to.be.true('libp2p key could not verify Helia signature')

        const libp2pSig = await libp2pPrivateKey.sign(message)
        expect(await heliaPrivateKey.publicKey.verify(message, libp2pSig)).to.be.true('Helia key could not verify libp2p signature')
      })

      it(`libp2p keys should be compatible with ${key.type} Helia keys`, async () => {
        const heliaPrivateKey = await key.getImplementation().generatePrivateKey()
        const pb = heliaPrivateKey.toProtobuf()
        const libp2pPrivateKey = privateKeyFromProtobuf(pb)

        const message = Uint8Array.from([0, 1, 2, 3, 4])

        const heliaSig = await heliaPrivateKey.sign(message)
        expect(await libp2pPrivateKey.publicKey.verify(message, heliaSig)).to.be.true('libp2p key could not verify Helia signature')

        const libp2pSig = await libp2pPrivateKey.sign(message)
        expect(await heliaPrivateKey.publicKey.verify(message, libp2pSig)).to.be.true('Helia key could not verify libp2p signature')
      })
    })
  })
})
