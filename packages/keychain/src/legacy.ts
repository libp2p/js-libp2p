import { rsaCrypto } from '@ipshipyard/crypto'
import { decodeDer } from '@ipshipyard/crypto/der'
import { PrivateKeyMessage } from '@ipshipyard/crypto/pb'
import { base64 } from 'multiformats/bases/base64'
import type { PrivateKey } from '@ipshipyard/crypto'
import type { AbortOptions } from 'abort-error'

/**
 * Decode legacy RSA key stored as encrypted PEM files
 */
export async function privateKeyFromPEM (pem: string, cipher: any, options?: AbortOptions): Promise<PrivateKey> {
  pem = pem.replaceAll('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
  pem = pem.replaceAll('-----END ENCRYPTED PRIVATE KEY-----', '')
  pem = pem.replaceAll('\r', '')
  pem = pem.replaceAll('\n', '')

  const decoded = base64.decode(`m${pem}`)
  const der = decodeDer(decoded)

  // this looks fragile but DER is a canonical format so we are safe to have
  // deep property chains like this
  const salt = der[0][1][0][1][0]
  const iterations = toNumber(der[0][1][0][1][1])
  const keyLength = toNumber(der[0][1][0][1][2])
  const iv = der[0][1][0][1][4][1]
  const keyData = der[0][1][0][1][4][2]

  const plainText = await cipher.decrypt(salt, iv, keyData, {
    iterations,
    keyLength: keyLength * 8,
    hash: 'SHA-512',
    algorithm: 'AES-CBC',
    signal: options?.signal
  })

  const keyWrapper = decodeDer(plainText)
  const pkcs1 = keyWrapper[2]

  const pb = PrivateKeyMessage.encode({
    Type: 0,
    Data: pkcs1
  })

  return rsaCrypto().privateKeyFromProtobuf(pb)
}

function toNumber (buf: Uint8Array): number {
  if (buf.length === 0) {
    return 0
  }

  const str = [...buf]
    .map(n => n.toString(16).padStart(2, '0'))
    .join('')

  return parseInt(str, 16)
}
