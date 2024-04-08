import * as x509 from '@peculiar/x509'
import { sha256 } from 'multiformats/hashes/sha2'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { WebTransportCertificate } from '../../src/index.js'

const ONE_DAY_MS = 86400000

export interface GenerateWebTransportCertificateOptions {
  days: number
  start?: Date
  extensions?: any[]
}

x509.cryptoProvider.set(globalThis.crypto)

async function generateWebTransportCertificate (keyPair: CryptoKeyPair, options: GenerateWebTransportCertificateOptions): Promise<WebTransportCertificate> {
  const notBefore = options.start ?? new Date()
  notBefore.setMilliseconds(0)
  const notAfter = new Date(notBefore.getTime() + (options.days * ONE_DAY_MS))
  notAfter.setMilliseconds(0)

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: (BigInt(Math.random().toString().replace('.', '')) * 100000n).toString(16),
    name: 'test-cert',
    notBefore,
    notAfter,
    signingAlgorithm: {
      name: 'ECDSA'
    },
    keys: keyPair,
    extensions: [
      new x509.BasicConstraintsExtension(true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation | x509.KeyUsageFlags.keyEncipherment | x509.KeyUsageFlags.dataEncipherment | x509.KeyUsageFlags.keyCertSign, false),
      new x509.SubjectAlternativeNameExtension([
        { type: 'url', value: 'http://example.org/webid#me' }
      ])
    ]
  })

  const exported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const privateKeyPem = [
    '-----BEGIN PRIVATE KEY-----',
    ...uint8ArrayToString(new Uint8Array(exported), 'base64pad').split(/(.{64})/).filter(Boolean),
    '-----END PRIVATE KEY-----'
  ].join('\n')

  return {
    privateKey: privateKeyPem,
    pem: cert.toString('pem'),
    hash: await sha256.digest(new Uint8Array(cert.rawData)),
    secret: 'super-secret-shhhhhh'
  }
}

export async function generateWebTransportCertificates (options: GenerateWebTransportCertificateOptions[] = []): Promise<WebTransportCertificate[]> {
  const keyPair = await crypto.subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, ['sign', 'verify'])

  return Promise.all(
    options.map(async opts => generateWebTransportCertificate(keyPair, opts))
  )
}
