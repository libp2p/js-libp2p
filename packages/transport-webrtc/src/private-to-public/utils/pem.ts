import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { PrivateKey } from '@libp2p/interface'

export function toBuffer (uint8Array: Uint8Array): Buffer {
  return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength)
}

export async function formatAsPem (privateKey: PrivateKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateKey.toJWK(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  const exported = await crypto.subtle.exportKey('pkcs8', key)

  return [
    '-----BEGIN PRIVATE KEY-----',
    ...uint8ArrayToString(new Uint8Array(exported), 'base64pad').split(/(.{64})/).filter(Boolean),
    '-----END PRIVATE KEY-----'
  ].join('\n')
}
