import { base64 } from 'multiformats/bases/base64'
import * as ciphers from '../ciphers/aes-gcm.js'
import type { Multibase } from 'multiformats'

/**
 * Exports the given PrivateKey as a base64 encoded string.
 * The PrivateKey is encrypted via a password derived PBKDF2 key
 * leveraging the aes-gcm cipher algorithm.
 */
export async function exporter (privateKey: Uint8Array, password: string): Promise<Multibase<'m'>> {
  const cipher = ciphers.create()
  const encryptedKey = await cipher.encrypt(privateKey, password)
  return base64.encode(encryptedKey)
}
