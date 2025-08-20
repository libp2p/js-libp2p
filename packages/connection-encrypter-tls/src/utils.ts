import { Duplex as DuplexStream } from 'node:stream'
import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidCryptoExchangeError, UnexpectedPeerError } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import { AsnConvert } from '@peculiar/asn1-schema'
import * as asn1X509 from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import * as asn1js from 'asn1js'
import { queuelessPushable } from 'it-queueless-pushable'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { InvalidCertificateError } from './errors.js'
import { KeyType, PublicKey } from './pb/index.js'
import type { PeerId, PublicKey as Libp2pPublicKey, Logger, PrivateKey, AbortOptions } from '@libp2p/interface'
import type { Pushable } from 'it-queueless-pushable'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

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

export function itToStream (conn: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>>): DuplexStream {
  const output = queuelessPushable<Uint8Array>()
  const iterator = conn.source[Symbol.asyncIterator]() as AsyncGenerator<Uint8Array>

  const stream = new DuplexStream({
    autoDestroy: false,
    allowHalfOpen: true,
    write (chunk, encoding, callback) {
      output.push(chunk)
        .then(() => {
          callback()
        }, err => {
          callback(err)
        })
    },
    read () {
      iterator.next()
        .then(result => {
          if (result.done === true) {
            this.push(null)
          } else {
            this.push(result.value)
          }
        }, (err) => {
          this.destroy(err)
        })
    }
  })

  // @ts-expect-error return type of sink is unknown
  conn.sink(output)
    .catch((err: any) => {
      stream.destroy(err)
    })

  return stream
}

class DuplexIterable implements Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  source: Pushable<Uint8Array>
  private readonly stream: DuplexStream

  constructor (stream: DuplexStream) {
    this.stream = stream
    this.source = queuelessPushable<Uint8Array>()

    stream.addListener('data', (buf) => {
      stream.pause()
      this.source.push(buf.subarray())
        .then(() => {
          stream.resume()
        }, (err) => {
          stream.emit('error', err)
        })
    })
    // both ends closed
    stream.addListener('close', () => {
      this.source.end()
        .catch(err => {
          stream.emit('error', err)
        })
    })
    stream.addListener('error', (err) => {
      this.source.end(err)
        .catch(() => {})
    })
    // just writable end closed
    stream.addListener('finish', () => {
      this.source.end()
        .catch(() => {})
    })

    this.sink = this.sink.bind(this)
  }

  async sink (source: Source<Uint8Array | Uint8ArrayList>): Promise<void> {
    try {
      for await (const buf of source) {
        const sendMore = this.stream.write(buf.subarray())

        if (!sendMore) {
          await waitForBackpressure(this.stream)
        }
      }

      // close writable end
      this.stream.end()
    } catch (err: any) {
      this.stream.destroy(err)
      throw err
    }
  }
}

export function streamToIt (stream: DuplexStream): Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  return new DuplexIterable(stream)
}

async function waitForBackpressure (stream: DuplexStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const continueListener = (): void => {
      cleanUp()
      resolve()
    }
    const stopListener = (err?: Error): void => {
      cleanUp()
      reject(err ?? new Error('Stream ended'))
    }

    const cleanUp = (): void => {
      stream.removeListener('drain', continueListener)
      stream.removeListener('end', stopListener)
      stream.removeListener('error', stopListener)
    }

    stream.addListener('drain', continueListener)
    stream.addListener('end', stopListener)
    stream.addListener('error', stopListener)
  })
}
