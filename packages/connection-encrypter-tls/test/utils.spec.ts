import { expect } from 'aegir/chai'
import { verifyPeerCertificate } from '../src/utils.js'
import * as testVectors from './fixtures/test-vectors.js'

describe('utils', () => {
  // unsupported key type
  it.skip('should verify correct ECDSA certificate', async () => {
    const peerId = await verifyPeerCertificate(testVectors.validECDSACertificate.cert)

    expect(peerId.toString()).to.equal(testVectors.validECDSACertificate.peerId.toString())
  })

  it('should verify correct Ed25519 certificate', async () => {
    const peerId = await verifyPeerCertificate(testVectors.validEd25519Certificate.cert)

    expect(peerId.toString()).to.equal(testVectors.validEd25519Certificate.peerId.toString())
  })

  it('should verify correct Secp256k1 certificate', async () => {
    const peerId = await verifyPeerCertificate(testVectors.validSecp256k1Certificate.cert)

    expect(peerId.toString()).to.equal(testVectors.validSecp256k1Certificate.peerId.toString())
  })

  it('should reject certificate with bad signature', async () => {
    await expect(verifyPeerCertificate(testVectors.invalidCertificate.cert)).to.eventually.be.rejected
      .with.property('code', 'ERR_INVALID_CRYPTO_EXCHANGE')
  })
})
