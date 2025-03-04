import { Crypto } from '@peculiar/webcrypto'
import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import { WebRTCDirectListener, type WebRTCDirectListenerInit } from '../src/private-to-public/listener.js'
import { type WebRTCDirectTransportComponents } from '../src/private-to-public/transport.js'
import { generateTransportCertificate } from '../src/private-to-public/utils/generate-certificates.js'
import type { TransportCertificate } from '../src/index.js'

const crypto = new Crypto()

describe('WebRTCDirectListener', () => {
  let listener: WebRTCDirectListener
  let components: WebRTCDirectTransportComponents
  let init: WebRTCDirectListenerInit

  beforeEach(() => {
    components = {
      peerId: { toB58String: () => 'QmPeerId' } as any,
      privateKey: {} as any,
      logger: {
        forComponent: () => ({
          trace: () => {},
          error: () => {}
        })
      } as any,
      transportManager: {} as any
    }

    init = {
      certificateDuration: 10,
      upgrader: {} as any
    }

    listener = new WebRTCDirectListener(components, init)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should generate a certificate with the configured duration', async () => {
    const keyPair = await crypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify'])

    const certificate: TransportCertificate = await generateTransportCertificate(keyPair, {
      days: init.certificateDuration!
    })

    expect(new Date(certificate.notAfter).getTime()).to.be.closeTo(
      new Date().getTime() + init.certificateDuration! * 86400000,
      1000
    )
  })

  it('should re-emit listening event when a new certificate is generated', async () => {
    const emitSpy = sinon.spy(listener as any, 'safeDispatchEvent')
    const generateCertificateSpy = sinon.spy(generateTransportCertificate)

    await (listener as any).startUDPMuxServer('127.0.0.1', 0)

    expect(generateCertificateSpy.called).to.be.true
    expect(emitSpy.calledWith('listening')).to.be.true
  })

  it('should generate a new certificate before expiry', async () => {
    (listener as any).certificate = {
      notAfter: new Date(Date.now() + 5 * 86400000).toISOString()
    }

    const isCertificateExpiringSpy = sinon.spy(listener as any, 'isCertificateExpiring')
    const generateCertificateSpy = sinon.spy(generateTransportCertificate) 

    await (listener as any).startUDPMuxServer('127.0.0.1', 0)

    expect(isCertificateExpiringSpy.returned(true)).to.be.true
    expect(generateCertificateSpy.called).to.be.true
  })
})