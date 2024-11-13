import { Buffer } from 'node:buffer'
import { createPrivateKey } from 'node:crypto'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { generateKeyPair, privateKeyFromRaw } from '@libp2p/crypto/keys'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { IP, QUICV1, TCP, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
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
