import { expect } from 'aegir/chai'
import { createCryptoLoader, ed25519Crypto } from '../src/index.ts'
import { secp256k1Crypto } from '../src/secp256k1.ts'

describe('createCryptoLoader', () => {
  it('loads the defaults by type and by code', async () => {
    const getCrypto = createCryptoLoader()

    for (const [type, code] of [['RSA', 0], ['Ed25519', 1], ['ECDSA', 3]] as const) {
      expect((await getCrypto(type)).code).to.equal(code)
      expect((await getCrypto(code)).type).to.equal(type)
    }
  })

  it('does not load secp256k1 by default', async () => {
    await expect(createCryptoLoader()('secp256k1')).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
    await expect(createCryptoLoader()(2)).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
  })

  it('names the missing type in the error', async () => {
    await expect(createCryptoLoader()('nope')).to.eventually.be.rejected.with.property('message').that.matches(/nope/)
  })

  it('adds cryptos', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])

    expect((await getCrypto(2)).type).to.equal('secp256k1')
  })

  it('replaces a default with the same type', async () => {
    const replacement = ed25519Crypto()
    const getCrypto = createCryptoLoader([replacement])

    expect(await getCrypto('Ed25519')).to.equal(replacement)
    expect(await getCrypto(1)).to.equal(replacement)
  })
})
