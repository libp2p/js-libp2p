import { privateKeyToCryptoKeyPair } from '@libp2p/crypto/keys'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { PrivateKey } from '@libp2p/interface'

export function toBuffer (uint8Array: Uint8Array): Buffer {
  return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength)
}

export async function formatAsPem (privateKey: PrivateKey): Promise<string> {
  const keyPair = await privateKeyToCryptoKeyPair(privateKey)
  const exported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  return [
    '-----BEGIN PRIVATE KEY-----',
    ...uint8ArrayToString(new Uint8Array(exported), 'base64pad').split(/(.{64})/).filter(Boolean),
    '-----END PRIVATE KEY-----'
  ].join('\n')
}
