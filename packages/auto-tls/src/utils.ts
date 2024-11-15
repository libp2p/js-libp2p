import { Buffer } from 'node:buffer'
import { createPrivateKey, createPublicKey } from 'node:crypto'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { IP, QUICV1, TCP, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
import { KeyUsageFlags, KeyUsagesExtension, PemConverter, Pkcs10CertificateRequestGenerator, SubjectAlternativeNameExtension, cryptoProvider } from '@peculiar/x509'
import { IncorrectKeyType } from './errors.js'
import type { RSAPrivateKey } from '@libp2p/interface'
import type { Keychain } from '@libp2p/keychain'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Loads a key and returns it in PCKS#1 DER in PEM format
 */
export async function loadOrCreateKey (keychain: Keychain, name: string, size: number): Promise<string> {
  let key: RSAPrivateKey

  try {
    const storedKey = await keychain.exportKey(name)

    if (storedKey.type !== 'RSA') {
      throw new IncorrectKeyType(`Key type must be RSA, got "${storedKey.type}"`)
    }

    key = storedKey
  } catch (err: any) {
    if (err.name !== 'NotFoundError') {
      throw err
    }

    key = await generateKeyPair('RSA', size)
    await keychain.importKey(name, key)
  }

  return formatAsPem(key)
}

export function toBuffer (uint8Array: Uint8Array): Buffer {
  return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength)
}

export function formatAsPem (key: RSAPrivateKey): string {
  const obj = createPrivateKey({
    format: 'der',
    key: toBuffer(key.raw),
    type: 'pkcs1'
  })

  return obj.export({ format: 'pem', type: 'pkcs8' }).toString()
}

export function importFromPem (pem: string): RSAPrivateKey {
  const obj = createPrivateKey({
    format: 'pem',
    key: pem
  })
  const der = obj.export({
    format: 'der',
    type: 'pkcs1'
  })

  const key = privateKeyFromRaw(der)

  if (key.type !== 'RSA') {
    throw new IncorrectKeyType(`Got incorrect key type - ${key.type}`)
  }

  return key
}

export function supportedAddressesFilter (ma: Multiaddr): boolean {
  // only routable addresses
  if (isPrivate(ma) || isLoopback(ma)) {
    return false
  }

  // only these transports over IPvX
  return IP.matches(ma) && (
    TCP.exactMatch(ma) ||
    WebSockets.exactMatch(ma) ||
    WebSocketsSecure.exactMatch(ma) ||
    QUICV1.exactMatch(ma) ||
    WebTransport.exactMatch(ma)
  )
}

export function getPublicIps (addrs: Multiaddr[]): Set<string> {
  const output = new Set<string>()

  addrs.filter(supportedAddressesFilter)
    .forEach(ma => {
      const options = ma.toOptions()

      if (isIPv4(options.host) || isIPv6(options.host)) {
        output.add(options.host)
      }
    })

  return output
}

export async function createCsr (domain: string, keyPem: string): Promise<string> {
  const signingAlgorithm = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: { name: 'SHA-256' }
  }

  // have to use the same crypto provider as Pkcs10CertificateRequestGenerator
  const crypto = cryptoProvider.get()

  const jwk = createPublicKey({
    format: 'pem',
    key: keyPem
  }).export({
    format: 'jwk'
  })

  /* Decode PEM and import into CryptoKeyPair */
  const privateKeyDec = PemConverter.decodeFirst(keyPem.toString())
  const privateKey = await crypto.subtle.importKey('pkcs8', privateKeyDec, signingAlgorithm, true, ['sign'])
  const publicKey = await crypto.subtle.importKey('jwk', jwk, signingAlgorithm, true, ['verify'])

  const extensions = [
    /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.3 */
    new KeyUsagesExtension(KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment), // eslint-disable-line no-bitwise

    /* https://datatracker.ietf.org/doc/html/rfc5280#section-4.2.1.6 */
    new SubjectAlternativeNameExtension([{ type: 'dns', value: domain }])
  ]

  /* Create CSR */
  const csr = await Pkcs10CertificateRequestGenerator.create({
    keys: {
      privateKey,
      publicKey
    },
    extensions,
    signingAlgorithm,
    name: [{
      // @ts-expect-error herp
      CN: [{
        utf8String: domain
      }]
    }]
  }, crypto)

  return csr.toString('pem')
}
