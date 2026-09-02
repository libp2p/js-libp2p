import { Buffer } from 'buffer'
import { expect, assert } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { pureJsCrypto } from '../src/crypto/js.js'
import { wrapCrypto } from '../src/crypto.js'
import { XXHandshakeState, ZEROLEN } from '../src/protocol.js'
import type { CipherState, SymmetricState } from '../src/protocol.js'

describe('XXHandshakeState', () => {
  const prologue = Buffer.alloc(0)
  const protocolName = 'Noise_XX_25519_ChaChaPoly_SHA256'

  it('Test creating new XX session', async () => {
    try {
      // eslint-disable-next-line no-new
      new XXHandshakeState({ crypto: wrapCrypto(pureJsCrypto), protocolName, initiator: true, prologue })
    } catch (e) {
      assert(false, (e as Error).message)
    }
  })

  it('Test get HKDF', () => {
    const ckBytes = Buffer.from('4e6f6973655f58585f32353531395f58436861436861506f6c795f53484132353600000000000000000000000000000000000000000000000000000000000000', 'hex')
    const ikm = Buffer.from('a3eae50ea37a47e8a7aa0c7cd8e16528670536dcd538cebfd724fb68ce44f1910ad898860666227d4e8dd50d22a9a64d1c0a6f47ace092510161e9e442953da3', 'hex')
    const ck = Buffer.alloc(32)
    ckBytes.copy(ck)

    const [k1, k2, k3] = pureJsCrypto.getHKDF(ck, ikm)
    expect(uint8ArrayToString(k1, 'hex')).to.equal('cc5659adff12714982f806e2477a8d5ddd071def4c29bb38777b7e37046f6914')
    expect(uint8ArrayToString(k2, 'hex')).to.equal('a16ada915e551ab623f38be674bb4ef15d428ae9d80688899c9ef9b62ef208fa')
    expect(uint8ArrayToString(k3, 'hex')).to.equal('ff67bf9727e31b06efc203907e6786667d2c7a74ac412b4d31a80ba3fd766f68')
  })

  interface ProtocolHandshakeResult { ss: SymmetricState, cs1: CipherState, cs2: CipherState }
  async function doHandshake (): Promise<{ nsInit: ProtocolHandshakeResult, nsResp: ProtocolHandshakeResult }> {
    const kpInit = pureJsCrypto.generateX25519KeyPair()
    const kpResp = pureJsCrypto.generateX25519KeyPair()

    // initiator: new XX noise session
    const nsInit = new XXHandshakeState({ crypto: wrapCrypto(pureJsCrypto), protocolName, prologue, initiator: true, s: kpInit })
    // responder: new XX noise session
    const nsResp = new XXHandshakeState({ crypto: wrapCrypto(pureJsCrypto), protocolName, prologue, initiator: false, s: kpResp })

    /* STAGE 0 */

    // initiator sends message
    // responder receives message
    nsResp.readMessageA(new Uint8ArrayList(nsInit.writeMessageA(ZEROLEN)))

    /* STAGE 1 */

    // responder sends message
    // initiator receives message
    nsInit.readMessageB(new Uint8ArrayList(nsResp.writeMessageB(ZEROLEN)))

    /* STAGE 2 */

    // initiator sends message
    // responder receives message
    nsResp.readMessageC(new Uint8ArrayList(nsInit.writeMessageC(ZEROLEN)))

    const nsInitSplit = nsInit.ss.split()
    const nsRespSplit = nsResp.ss.split()

    assert(uint8ArrayEquals(nsInitSplit[0].k!, nsRespSplit[0].k!))

    assert(uint8ArrayEquals(nsInitSplit[1].k!, nsRespSplit[1].k!))

    return {
      nsInit: { ss: nsInit.ss, cs1: nsInitSplit[0], cs2: nsInitSplit[1] },
      nsResp: { ss: nsResp.ss, cs1: nsRespSplit[0], cs2: nsRespSplit[1] }
    }
  }

  it('Test symmetric encrypt and decrypt', async () => {
    try {
      const { nsInit, nsResp } = await doHandshake()
      const ad = Buffer.from('authenticated')
      const message = Buffer.from('HelloCrypto')

      const ciphertext = nsInit.cs1.encryptWithAd(ad, message)
      assert(!uint8ArrayEquals(Buffer.from('HelloCrypto'), ciphertext.subarray()), 'Encrypted message should not be same as plaintext.')
      const decrypted = nsResp.cs1.decryptWithAd(ad, ciphertext)

      assert(uint8ArrayEquals(Buffer.from('HelloCrypto'), decrypted.subarray()), 'Decrypted text not equal to original message.')
    } catch (e) {
      assert(false, (e as Error).message)
    }
  })

  it('Test multiple messages encryption and decryption', async () => {
    const { nsInit, nsResp } = await doHandshake()
    const ad = Buffer.from('authenticated')

    for (let i = 0; i < 50; i++) {
      const strMessage = 'ethereum' + String(i)
      const message = Buffer.from(strMessage)
      {
        const encrypted = nsInit.cs1.encryptWithAd(ad, message)
        const decrypted = nsResp.cs1.decryptWithAd(ad, encrypted)
        assert.equal(strMessage, uint8ArrayToString(decrypted.subarray(), 'utf8'), 'Decrypted text not equal to original message.')
      }
      {
        const encrypted = nsResp.cs2.encryptWithAd(ad, message)
        const decrypted = nsInit.cs2.decryptWithAd(ad, encrypted)
        assert.equal(strMessage, uint8ArrayToString(decrypted.subarray(), 'utf8'), 'Decrypted text not equal to original message.')
      }
    }
  })
})
