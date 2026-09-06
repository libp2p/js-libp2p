import 'reflect-metadata'
import { EventEmitter } from 'node:events'
import tls from 'node:tls'
import { logger } from '@libp2p/logger'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { toMessageStream, toNodeDuplex, verifyPeerCertificate } from '../src/utils.ts'
import * as testVectors from './fixtures/test-vectors.ts'
import type { StreamCloseEvent } from '@libp2p/interface'

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

  it('should destroy the socket and reset the connection when the stream is aborted', async () => {
    // a stubbed socket cannot reproduce the bug, only a real TLSSocket has the
    // TLSWrap handle that makes resetAndDestroy() throw
    const [connection, remoteConnection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)
      const socketClosed = pEvent(socket, 'close', {
        signal: AbortSignal.timeout(2_000)
      })
      const remoteClosed = pEvent(remoteConnection, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      // nothing has torn the connection down yet, so the assertions below can
      // only pass because of the abort
      expect(stream.status).to.equal('open')
      expect(connection.status).to.equal('open')

      stream.abort(new Error('Oh no!'))

      // resetAndDestroy() threw before it could destroy the socket, and abort()
      // swallows the error
      expect(socket.destroyed).to.be.true()

      // destroying the socket alone would only close the transport gracefully
      expect(connection.status).to.equal('aborted')

      await socketClosed
      await remoteClosed

      // the remote has to see a reset and not a graceful close
      expect(remoteConnection.status).to.equal('reset')
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should destroy the socket when the stream is closed', async () => {
    const [connection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)

      await stream.close({
        signal: AbortSignal.timeout(2_000)
      })

      expect(socket.destroyed).to.be.true()
      expect(stream.status).to.equal('closed')
      expect(connection.status).to.equal('closed')
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should wait for a socket that is already being destroyed to close', async () => {
    const [connection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)

      // destroy() is synchronous but 'close' is emitted on a later turn of the
      // event loop, so the teardown is still in flight here
      socket.destroy()

      await stream.close({
        signal: AbortSignal.timeout(2_000)
      })

      // close() has to wait for the teardown that was already running, the
      // socket closing on its own does not mean the transport has finished
      expect(stream.status).to.equal('closed')
      expect(connection.status).to.equal('closed')
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should not hang when the socket closed before the stream was created', async () => {
    const [connection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      socket.destroy()
      await pEvent(socket, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      // the socket will never emit 'close' again, so close() cannot wait for it
      const stream = toMessageStream(connection, socket)

      await expect(stream.close({
        signal: AbortSignal.timeout(2_000)
      })).to.eventually.be.fulfilled()
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should not hang when the stream is closed after being aborted', async () => {
    const [connection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)

      stream.abort(new Error('Oh no!'))

      // wait for the abort's 'close' to be emitted, otherwise an unguarded
      // close() would resolve on it and this test could never fail
      await pEvent(socket, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      // the socket cannot emit 'close' again, so close() has to return early
      await expect(stream.close({
        signal: AbortSignal.timeout(2_000)
      })).to.eventually.be.fulfilled()

      expect(connection.status).to.equal('aborted')
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should surface a transport error to the application', async () => {
    const [connection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)
      const closed = pEvent<'close', StreamCloseEvent>(stream, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      const err = new Error('Bad record MAC')
      err.name = 'SSLError'
      socket.emit('error', err)

      const evt = await closed
      expect(stream.status).to.equal('aborted')
      expect(evt.error).to.have.property('name', 'SSLError')
      expect(evt.local).to.be.true()
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should surface a remote reset to the application', async () => {
    const [connection, remoteConnection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)
      const closed = pEvent<'close', StreamCloseEvent>(stream, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      remoteConnection.abort(new Error('Remote went away'))

      const evt = await closed
      expect(stream.status).to.equal('reset')
      expect(evt.error).to.have.property('name', 'StreamResetError')
      expect(evt.local).to.be.false()

      // nothing else tears the socket down on this branch
      expect(socket.destroyed).to.be.true()
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })

  it('should not report an error when the connection closes cleanly', async () => {
    const [connection, remoteConnection] = multiaddrConnectionPair()
    const socket = new tls.TLSSocket(toNodeDuplex(connection))

    try {
      const stream = toMessageStream(connection, socket)
      const closed = pEvent<'close', StreamCloseEvent>(stream, 'close', {
        signal: AbortSignal.timeout(2_000)
      })

      await remoteConnection.close()

      const evt = await closed
      expect(evt.error).to.be.undefined()
      expect(stream.status).to.equal('closed')

      // nothing else tears the socket down on this branch
      expect(socket.destroyed).to.be.true()
    } finally {
      socket.destroy()
      connection.abort(new Error('Test over'))
    }
  })
})
