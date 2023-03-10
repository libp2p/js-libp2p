import { base64 } from 'multiformats/bases/base64'
import * as ciphers from '../ciphers/aes-gcm.js'

/**
 * Attempts to decrypt a base64 encoded PrivateKey string
 * with the given password. The privateKey must have been exported
 * using the same password and underlying cipher (aes-gcm)
 */
export async function importer (privateKey: string, password: string): Promise<Uint8Array> {
  const encryptedKey = base64.decode(privateKey)
  const cipher = ciphers.create()
  return await cipher.decrypt(encryptedKey, password)
}
