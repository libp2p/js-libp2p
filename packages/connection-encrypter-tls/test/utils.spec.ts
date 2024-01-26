import { logger } from '@libp2p/logger'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { expect } from 'aegir/chai'
import { verifyPeerCertificate } from '../src/utils.js'
import * as testVectors from './fixtures/test-vectors.js'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

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

  it('should reject certificate with a the wrong peer id in the extension', async () => {
    await expect(verifyPeerCertificate(testVectors.wrongPeerIdInExtension.cert, undefined, logger('libp2p'))).to.eventually.be.rejected
      .with.property('code', 'ERR_INVALID_CRYPTO_EXCHANGE')
  })

  it('should reject certificate with invalid self signature', async () => {
    await expect(verifyPeerCertificate(testVectors.invalidCertificateSignature.cert, undefined, logger('libp2p'))).to.eventually.be.rejected
      .with.property('code', 'ERR_INVALID_CRYPTO_EXCHANGE')
  })

  it('should reject certificate with a chain', async () => {
    const alg = {
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: 'SHA-256'
    }
    const rootKeys = await crypto.subtle.generateKey(alg, false, ['sign', 'verify'])
    const rootCert = await x509.X509CertificateGenerator.createSelfSigned({
      serialNumber: '01',
      name: 'CN=Certificates-R-us',
      notBefore: new Date('1970/01/01'),
      notAfter: new Date('3070/01/01'),
      signingAlgorithm: alg,
      keys: rootKeys,
      extensions: [
        new x509.BasicConstraintsExtension(true, 2, true),
        new x509.ExtendedKeyUsageExtension(['1.2.3.4.5.6.7', '2.3.4.5.6.7.8'], true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
        await x509.SubjectKeyIdentifierExtension.create(rootKeys.publicKey)
      ]
    })

    const cert = await x509.X509CertificateGenerator.create({
      publicKey: rootKeys.publicKey,
      signingKey: rootKeys.privateKey,
      subject: '',
      issuer: rootCert.subject,
      serialNumber: '02',
      notBefore: new Date('1970/01/01'),
      notAfter: new Date('3070/01/01'),
      signingAlgorithm: alg
    })

    await expect(verifyPeerCertificate(new Uint8Array(cert.rawData), undefined, logger('libp2p'))).to.eventually.be.rejected
      .with.property('code', 'ERR_INVALID_CRYPTO_EXCHANGE')
  })
})
