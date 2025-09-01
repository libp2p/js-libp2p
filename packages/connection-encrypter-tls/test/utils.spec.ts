import { EventEmitter } from 'node:events'
import { logger } from '@libp2p/logger'
import { streamPair } from '@libp2p/utils'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { toMessageStream, toNodeDuplex, verifyPeerCertificate } from '../src/utils.js'
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
      .with.property('name', 'InvalidCryptoExchangeError')
  })

  it('should reject certificate with invalid self signature', async () => {
    await expect(verifyPeerCertificate(testVectors.invalidCertificateSignature.cert, undefined, logger('libp2p'))).to.eventually.be.rejected
      .with.property('name', 'InvalidCryptoExchangeError')
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
      .with.property('name', 'InvalidCryptoExchangeError')
  })

  it('should pipe stream messages to socket', async () => {
    const [outboundStream, inboundStream] = await streamPair()
    const [outboundSocket, inboundSocket] = [toNodeDuplex(outboundStream), toNodeDuplex(inboundStream)]

    const toSend = new Array(1_000).fill(0).map(() => {
      return Uint8Array.from(new Array(1_000).fill(0))
    })

    let received = 0

    inboundSocket.addListener('data', (buf) => {
      received += buf.byteLength
    })

    let sent = 0

    for (const buf of toSend) {
      const sendMore = outboundSocket.write(buf)
      sent += buf.byteLength

      if (sendMore === false) {
        await pEvent(outboundSocket, 'drain', {
          rejectionEvents: [
            'close'
          ]
        })
      }
    }

    outboundSocket.end()
    inboundSocket.end()

    await Promise.all([
      pEvent(outboundStream, 'close'),
      pEvent(inboundStream, 'close')
    ])

    expect(received).to.deep.equal(sent)
  })

  it('should pipe socket messages to stream', async () => {
    const [outboundStream, inboundStream] = await streamPair()
    const emitter = new EventEmitter()

    // close writable end of inbound stream
    await inboundStream.close()

    // @ts-expect-error return types of emitter methods are incompatible
    const socket = stubInterface<tls.TLSSocket>(emitter)
    const stream = toMessageStream(outboundStream, socket)

    const sent = new Array(1_000).fill(0).map(() => {
      return Uint8Array.from(new Array(1_000).fill(0))
    })

    const received: Array<Uint8Array | Uint8ArrayList> = []

    stream.addEventListener('message', (evt) => {
      received.push(evt.data)
    })

    for (const buf of sent) {
      emitter.emit('data', buf)
    }

    emitter.emit('close')

    await pEvent(outboundStream, 'close')

    expect(new Uint8ArrayList(...received).subarray()).to.equalBytes(new Uint8ArrayList(...sent).subarray())
  })
})
