import { decodeDer } from '@libp2p/crypto/der'
import { PrivateKeyMessage } from '@libp2p/crypto/pb'
import { sha1 } from '@noble/hashes/legacy.js'
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { base64 } from 'multiformats/bases/base64'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { pbkdf2Bytes } from './cipher.ts'
import { DecryptionFailedError } from './errors.ts'
import type { DekHash } from './cipher.ts'

export interface LegacyDek {
  keyLength: number
  hash: 'sha1' | 'sha2-256' | 'sha2-512'
}

export const DEFAULT_LEGACY_DEK: LegacyDek = { keyLength: 64, hash: 'sha2-512' }

const HASHES = { sha1, 'sha2-256': sha256, 'sha2-512': sha512 }

// PBKDF2 PRF OIDs from RFC 8018
const PBKDF2_PRF_HASHES: Record<string, DekHash> = {
  '1.2.840.113549.2.9': 'SHA-256',
  '1.2.840.113549.2.10': 'SHA-384',
  '1.2.840.113549.2.11': 'SHA-512'
}

/**
 * The key the previous keychain encrypted entries with, an empty string when
 * no password was set
 */
export function deriveLegacyDek (password: string | undefined, salt: Uint8Array, iterations: number, legacy: LegacyDek): string {
  if (password == null) {
    return ''
  }

  const dek = pbkdf2(HASHES[legacy.hash], uint8ArrayFromString(password), salt, { c: iterations, dkLen: legacy.keyLength })

  return base64.baseEncode(dek)
}

export function isPem (text: string): boolean {
  return text.includes('BEGIN ENCRYPTED PRIVATE KEY')
}

/**
 * Decrypts a PBES2 (PBKDF2, AES-CBC) PKCS#8 PEM written by the previous
 * keychain for RSA keys and returns it as a key protobuf
 */
export async function decryptPem (dek: string, pem: string): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const body = pem
      .replaceAll('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
      .replaceAll('-----END ENCRYPTED PRIVATE KEY-----', '')
      .replaceAll(/\s/g, '')
    const der = decodeDer(base64.decode(`m${body}`))

    // decodeDer flattens trailing siblings into the preceding sequence, so the
    // PBKDF2 params hold [salt, iterations, keyLength, [prf], [cipher, iv, ciphertext]]
    const params = der[0][1][0][1]
    const salt: Uint8Array = params[0]
    const iterations = toNumber(params[1])
    const keyLength = toNumber(params[2])
    const hash = PBKDF2_PRF_HASHES[params[3][0]]
    const iv: Uint8Array = params[4][1]
    const cipherText: Uint8Array = params[4][2]

    if (hash == null) {
      throw new Error(`Unsupported PBKDF2 PRF ${params[3][0]}`)
    }

    const keyBytes = await pbkdf2Bytes(uint8ArrayFromString(dek), salt, iterations, hash, keyLength * 8)
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt'])
    const plainText = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: withArrayBuffer(iv) }, key, withArrayBuffer(cipherText)))
    // PrivateKeyInfo is [version, algorithm, privateKey]
    const pkcs1 = decodeDer(plainText)[2]

    return PrivateKeyMessage.encode({ Type: 0, Data: pkcs1 })
  } catch (err: any) {
    throw new DecryptionFailedError(`Could not decrypt PEM - ${err.message}`)
  }
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
