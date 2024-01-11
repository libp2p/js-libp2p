import type { RsaPrivateKey } from '@libp2p/crypto/keys'
import * as crypto from './rsa.js'
import type { Uint8ArrayList } from 'uint8arraylist'

export function decrypt (key: RsaPrivateKey, bytes: Uint8Array | Uint8ArrayList): Uint8Array {
  // @ts-expect-error private field
  return crypto.decrypt(key._key, bytes)
}
