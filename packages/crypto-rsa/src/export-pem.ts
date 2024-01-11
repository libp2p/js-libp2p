// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import 'node-forge/lib/sha512.js'
import 'node-forge/lib/asn1.js'
import 'node-forge/lib/pki.js'
import type { RsaPrivateKey } from '@libp2p/crypto/keys'

export function exportPEM (key: RsaPrivateKey, password: string): string {
  const buffer = new forge.util.ByteBuffer(key.marshal())
  const asn1 = forge.asn1.fromDer(buffer)
  const privateKey = forge.pki.privateKeyFromAsn1(asn1)

  const options = {
    algorithm: 'aes256',
    count: 10000,
    saltSize: 128 / 8,
    prfAlgorithm: 'sha512'
  }

  return forge.pki.encryptRsaPrivateKey(privateKey, password, options)
}
