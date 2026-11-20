import { decodeDer } from '@libp2p/crypto/der'
import { PrivateKeyMessage } from '@libp2p/crypto/pb'
import { sha1 } from '@noble/hashes/legacy.js'
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { base64 } from 'multiformats/bases/base64'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
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

    return PrivateKeyMessage.encode({ Type: 0, Data: rsaKeyFromPkcs8(plainText) })
  } catch (err: any) {
    throw new DecryptionFailedError(`Could not decrypt PEM - ${err.message}`)
  }
}

// PKCS#8 of a 16384 bit RSA key is under 10KiB
const MAX_PKCS8_LENGTH = 16_384

// DER of OID 1.2.840.113549.1.1.1 (rsaEncryption)
const RSA_ENCRYPTION_OID = Uint8Array.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01])

interface Tlv {
  tag: number
  start: number
  end: number
}

/**
 * Reads one DER element, rejecting lengths that run past `limit`
 */
function readTlv (buf: Uint8Array, offset: number, limit: number): Tlv {
  if (offset + 2 > limit) {
    throw new Error('Truncated DER')
  }

  const tag = buf[offset]
  let length = buf[offset + 1]
  let start = offset + 2

  if (length > 0x80) {
    const count = length & 0x7f

    if (count > 2 || start + count > limit) {
      throw new Error('Invalid DER length')
    }

    length = 0

    for (let i = 0; i < count; i++) {
      length = (length << 8) | buf[start + i]
    }

    start += count
  } else if (length === 0x80) {
    throw new Error('Indefinite DER length')
  }

  if (start + length > limit) {
    throw new Error('Truncated DER')
  }

  return { tag, start, end: start + length }
}

function expectTag (tlv: Tlv, tag: number): Tlv {
  if (tlv.tag !== tag) {
    throw new Error(`Expected DER tag 0x${tag.toString(16)}`)
  }

  return tlv
}

function isZeroInteger (buf: Uint8Array, tlv: Tlv): boolean {
  return tlv.tag === 0x02 && tlv.end - tlv.start === 1 && buf[tlv.start] === 0
}

/**
 * Strictly parses a PKCS#8 PrivateKeyInfo holding an RSA key and returns the
 * PKCS#1 RSAPrivateKey. AES-CBC has no integrity check, so this is what
 * rejects a PEM decrypted with the wrong password.
 */
export function rsaKeyFromPkcs8 (buf: Uint8Array): Uint8Array {
  if (buf.byteLength > MAX_PKCS8_LENGTH) {
    throw new Error('PKCS#8 is too long')
  }

  const info = expectTag(readTlv(buf, 0, buf.byteLength), 0x30)

  if (info.end !== buf.byteLength) {
    throw new Error('Trailing data after PKCS#8')
  }

  const version = readTlv(buf, info.start, info.end)

  if (!isZeroInteger(buf, version)) {
    throw new Error('Unsupported PKCS#8 version')
  }

  const algorithm = expectTag(readTlv(buf, version.end, info.end), 0x30)
  const oid = expectTag(readTlv(buf, algorithm.start, algorithm.end), 0x06)

  if (!uint8ArrayEquals(buf.subarray(oid.start, oid.end), RSA_ENCRYPTION_OID)) {
    throw new Error('PKCS#8 does not hold an RSA key')
  }

  const privateKey = expectTag(readTlv(buf, algorithm.end, info.end), 0x04)

  // optional attributes
  if (privateKey.end !== info.end) {
    const attributes = expectTag(readTlv(buf, privateKey.end, info.end), 0xa0)

    if (attributes.end !== info.end) {
      throw new Error('Trailing data in PKCS#8')
    }
  }

  // RSAPrivateKey is version 0 then n, e, d, p, q, dp, dq and qi
  const rsaKey = expectTag(readTlv(buf, privateKey.start, privateKey.end), 0x30)

  if (rsaKey.end !== privateKey.end) {
    throw new Error('Trailing data after RSAPrivateKey')
  }

  let field = readTlv(buf, rsaKey.start, rsaKey.end)

  if (!isZeroInteger(buf, field)) {
    throw new Error('Unsupported RSAPrivateKey version')
  }

  for (let i = 0; i < 8; i++) {
    field = expectTag(readTlv(buf, field.end, rsaKey.end), 0x02)

    if (field.end === field.start) {
      throw new Error('Empty RSAPrivateKey integer')
    }
  }

  if (field.end !== rsaKey.end) {
    throw new Error('Trailing data in RSAPrivateKey')
  }

  return buf.subarray(privateKey.start, privateKey.end)
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
