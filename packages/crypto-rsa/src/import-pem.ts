import { supportedKeys } from '@libp2p/crypto/keys'
import { CodeError } from '@libp2p/interface'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import 'node-forge/lib/sha512.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { RsaPrivateKey } from '@libp2p/crypto/keys'

export async function importPEM (encryptedKey: string, password: string): Promise<RsaPrivateKey> {
  // Only rsa supports pem right now
  const key = forge.pki.decryptRsaPrivateKey(encryptedKey, password)
  if (key === null) {
    throw new CodeError('Cannot read the key, most likely the password is wrong or not a RSA key', 'ERR_CANNOT_DECRYPT_PEM')
  }
  let der = forge.asn1.toDer(forge.pki.privateKeyToAsn1(key))
  der = uint8ArrayFromString(der.getBytes(), 'ascii')
  return supportedKeys.rsa.unmarshalRsaPrivateKey(der)
}
