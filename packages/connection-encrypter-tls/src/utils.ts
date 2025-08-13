import net from 'node:net'
import { Duplex } from 'node:stream'
import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidCryptoExchangeError, StreamClosedError, UnexpectedPeerError, StreamMessageEvent } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import { AbstractMessageStream, socketWriter } from '@libp2p/utils'
import { AsnConvert } from '@peculiar/asn1-schema'
import * as asn1X509 from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import * as asn1js from 'asn1js'
import { Uint8ArrayList } from 'uint8arraylist'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { InvalidCertificateError } from './errors.js'
import { KeyType, PublicKey } from './pb/index.js'
import type { PeerId, PublicKey as Libp2pPublicKey, Logger, PrivateKey, AbortOptions, MessageStream, StreamCloseEvent } from '@libp2p/interface'
import type { SendResult, SocketWriter } from '@libp2p/utils'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

const LIBP2P_PUBLIC_KEY_EXTENSION = '1.3.6.1.4.1.53594.1.1'
const CERT_PREFIX = 'libp2p-tls-handshake:'
// https://github.com/libp2p/go-libp2p/blob/28c0f6ab32cd69e4b18e9e4b550ef6ce059a9d1a/p2p/security/tls/crypto.go#L265
const CERT_VALIDITY_PERIOD_FROM = 60 * 60 * 1000 // ~1 hour

// https://github.com/libp2p/go-libp2p/blob/28c0f6ab32cd69e4b18e9e4b550ef6ce059a9d1a/p2p/security/tls/crypto.go#L24C28-L24C44
const CERT_VALIDITY_PERIOD_TO = 100 * 365 * 24 * 60 * 60 * 1000 // ~100 years

export async function verifyPeerCertificate (rawCertificate: Uint8Array, expectedPeerId?: PeerId, log?: Logger): Promise<PeerId> {
  const now = Date.now()
  const x509Cert = new x509.X509Certificate(rawCertificate)

  if (x509Cert.notBefore.getTime() > now) {
    log?.error('the certificate was not valid yet')
    throw new InvalidCertificateError('The certificate is not valid yet')
  }

  if (x509Cert.notAfter.getTime() < now) {
    log?.error('the certificate has expired')
    throw new InvalidCertificateError('The certificate has expired')
  }

  const certSignatureValid = await x509Cert.verify()

  if (!certSignatureValid) {
    log?.error('certificate self signature was invalid')
    throw new InvalidCryptoExchangeError('Invalid certificate self signature')
  }

  const certIsSelfSigned = await x509Cert.isSelfSigned()

  if (!certIsSelfSigned) {
    log?.error('certificate must be self signed')
    throw new InvalidCryptoExchangeError('Certificate must be self signed')
  }

  const libp2pPublicKeyExtension = x509Cert.extensions[0]

  if (libp2pPublicKeyExtension == null || libp2pPublicKeyExtension.type !== LIBP2P_PUBLIC_KEY_EXTENSION) {
    log?.error('the certificate did not include the libp2p public key extension')
    throw new InvalidCertificateError('The certificate did not include the libp2p public key extension')
  }

  const { result: libp2pKeySequence } = asn1js.fromBER(libp2pPublicKeyExtension.value)

  // @ts-expect-error deep chain
  const remotePeerIdPb = libp2pKeySequence.valueBlock.value[0].valueBlock.valueHex
  const marshaledPeerId = new Uint8Array(remotePeerIdPb, 0, remotePeerIdPb.byteLength)
  const remoteLibp2pPublicKey: Libp2pPublicKey = publicKeyFromProtobuf(marshaledPeerId)

  // @ts-expect-error deep chain
  const remoteSignature = libp2pKeySequence.valueBlock.value[1].valueBlock.valueHex
  const dataToVerify = encodeSignatureData(x509Cert.publicKey.rawData)
  const result = await remoteLibp2pPublicKey.verify(dataToVerify, new Uint8Array(remoteSignature, 0, remoteSignature.byteLength))

  if (!result) {
    log?.error('invalid libp2p signature')
    throw new InvalidCryptoExchangeError('Could not verify signature')
  }

  const remotePeerId = peerIdFromCID(remoteLibp2pPublicKey.toCID())

  if (expectedPeerId?.equals(remotePeerId) === false) {
    log?.error('invalid peer id')
    throw new UnexpectedPeerError()
  }

  return remotePeerId
}

export async function generateCertificate (privateKey: PrivateKey, options?: AbortOptions): Promise<{ cert: string, key: string }> {
  const now = Date.now()

  const alg = {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: 'SHA-256'
  }

  const keys = await crypto.subtle.generateKey(alg, true, ['sign'])
  options?.signal?.throwIfAborted()

  const certPublicKeySpki = await crypto.subtle.exportKey('spki', keys.publicKey)
  options?.signal?.throwIfAborted()

  const dataToSign = encodeSignatureData(certPublicKeySpki)
  const sig = await privateKey.sign(dataToSign, options)
  const notAfter = new Date(now + CERT_VALIDITY_PERIOD_TO)
  // workaround for https://github.com/PeculiarVentures/x509/issues/73
  notAfter.setMilliseconds(0)

  const selfCert = await x509.X509CertificateGenerator.createSelfSigned({
    // this should be a long, large, random(ish), positive integer
    serialNumber: generateSerialNumber(),
    notBefore: new Date(now - CERT_VALIDITY_PERIOD_FROM),
    notAfter,
    signingAlgorithm: alg,
    keys,
    extensions: [
      new x509.Extension(LIBP2P_PUBLIC_KEY_EXTENSION, true, new asn1js.Sequence({
        value: [
          // publicKey
          new asn1js.OctetString({
            valueHex: PublicKey.encode({
              type: KeyType[privateKey.type],
              data: privateKey.publicKey.raw
            })
          }),
          // signature
          new asn1js.OctetString({
            valueHex: sig
          })
        ]
      }).toBER())
    ]
  })
  options?.signal?.throwIfAborted()

  const certPrivateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
  options?.signal?.throwIfAborted()

  return {
    cert: selfCert.toString(),
    key: pkcs8ToPEM(certPrivateKeyPkcs8)
  }
}

function generateSerialNumber (): string {
  // HACK: serial numbers starting with 80 generated by @peculiar/x509 don't
  // work with TLSSocket, remove when https://github.com/PeculiarVentures/x509/issues/74
  // is resolved
  while (true) {
    const serialNumber = (Math.random() * Math.pow(2, 52)).toFixed(0)

    if (!serialNumber.startsWith('80')) {
      return serialNumber
    }
  }
}

/**
 * @see https://github.com/libp2p/specs/blob/master/tls/tls.md#libp2p-public-key-extension
 */
export function encodeSignatureData (certPublicKey: ArrayBuffer): Uint8Array {
  const keyInfo = AsnConvert.parse(certPublicKey, asn1X509.SubjectPublicKeyInfo)
  const bytes = AsnConvert.serialize(keyInfo)

  return uint8ArrayConcat([
    uint8ArrayFromString(CERT_PREFIX),
    new Uint8Array(bytes, 0, bytes.byteLength)
  ])
}

function pkcs8ToPEM (keydata: ArrayBuffer): string {
  return formatAsPem(uint8ArrayToString(new Uint8Array(keydata), 'base64'))
}

function formatAsPem (str: string): string {
  let finalString = '-----BEGIN PRIVATE KEY-----\n'

  while (str.length > 0) {
    finalString += str.substring(0, 64) + '\n'
    str = str.substring(64)
  }

  finalString = finalString + '-----END PRIVATE KEY-----'

  return finalString
}

export function toNodeDuplex (stream: MessageStream): Duplex {
  let sent = 0

  function sendAndCallback (chunk: Uint8Array | Uint8ArrayList, callback: (err?: Error | null) => void): void {
    sent += chunk.byteLength
    const sendMore = stream.send(chunk)

    if (sendMore) {
      callback()
      return
    }

    socket.pause()

    const cleanUp = (): void => {
      stream.removeEventListener('drain', onDrain)
      stream.removeEventListener('close', onClose)
      stream.removeEventListener('message', onMessage)
    }

    const onDrain = (): void => {
      cleanUp()
      callback()
      socket.resume()
    }
    const onClose = (evt: StreamCloseEvent): void => {
      console.info('wat sent', sent)
      cleanUp()

      if (evt.error != null) {
        callback(evt.error)
      } else {
        callback(new StreamClosedError('Stream closed before write'))
      }
    }

    stream.addEventListener('drain', onDrain, {
      once: true
    })
    stream.addEventListener('close', onClose, {
      once: true
    })
  }

  // pause incoming messages until pulled from duplex
  stream.pause()

  const socket = new Duplex({
    write (chunk, encoding, callback) {
      sendAndCallback(chunk, callback)
    },
    writev (chunks, callback) {
      sendAndCallback(new Uint8ArrayList(...chunks.map(({ chunk }) => chunk)), callback)
    },
    read () {
      stream.resume()
    },
    final (cb) {
      stream.closeWrite()
        .then(() => cb(), (err) => cb(err))
    }
  })

  // const writer = socketWriter(socket)

  const onMessage = (evt: StreamMessageEvent): void => {
    const buf = evt.data
    let sendMore = true

    if (buf instanceof Uint8Array) {
      sendMore = socket.push(buf)
    } else {
      for (const chunk of buf) {
        sendMore = socket.push(chunk)
      }
    }

    if (!sendMore) {
      stream.pause()
    }
  }
  stream.addEventListener('message', onMessage)

  return socket
}

class EncryptedMessageStream extends AbstractMessageStream {
  private socket: net.Socket
  private writer: SocketWriter

  constructor (stream: MessageStream, socket: net.Socket) {
    super({
      log: stream.log,
      inactivityTimeout: stream.inactivityTimeout,
      maxPauseBufferLength: stream.maxPauseBufferLength,
      direction: stream.direction
    })

    this.socket = socket
    this.writer = socketWriter(socket)

    this.socket.on('data', (buf) => {
      this.onData(buf)
    })
    this.socket.on('error', err => {
      stream.abort(err)
    })
    this.socket.on('close', () => {
      stream.closeWrite()
        .catch(err => {
          stream.abort(err)
        })
    })
    this.socket.on('drain', () => {
      this.safeDispatchEvent('drain')
    })
  }

  sendPause (): void {
    this.socket.pause()
  }

  sendResume (): void {
    this.socket.resume()
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.socket.end()
    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendReset (): void {
    this.socket.resetAndDestroy()
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: this.writer.write(data)
    }
  }
}

export function toMessageStream (stream: MessageStream, socket: net.Socket): MessageStream {
  return new EncryptedMessageStream(stream, socket)
}
