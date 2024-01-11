import * as crypto from './rsa.js'
import type { RsaPublicKey } from '@libp2p/crypto/keys'
import type { Uint8ArrayList } from 'uint8arraylist'

export function encrypt (key: RsaPublicKey, bytes: Uint8Array | Uint8ArrayList): Uint8Array {
  // @ts-expect-error private field
  return crypto.encrypt(key._key, bytes)
}
