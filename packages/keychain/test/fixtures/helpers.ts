import { createCryptoLoader } from '@libp2p/crypto'
import { decodeDer } from '@libp2p/crypto/der'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Key } from 'interface-datastore/key'
import all from 'it-all'
import { base64 } from 'multiformats/bases/base64'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { pbkdf2Bytes } from '../../src/cipher.ts'
import { Keychain } from '../../src/keychain.ts'
import type { LegacyKeychain } from './legacy-keychains.ts'
import type { KeychainInit, KeyInfo } from '../../src/index.ts'
import type { LegacyDek } from '../../src/legacy.ts'
import type { Datastore } from 'interface-datastore'

export async function load (fixture: LegacyKeychain): Promise<Datastore> {
  const datastore = new MemoryDatastore()

  for (const [key, value] of Object.entries(fixture.entries)) {
    await datastore.put(new Key(key), uint8ArrayFromString(value))
  }

  return datastore
}

export async function entries (datastore: Datastore): Promise<Record<string, string>> {
  const out: Record<string, string> = {}

  for await (const { key, value } of datastore.query({})) {
    out[key.toString()] = uint8ArrayToString(value)
  }

  return out
}

/**
 * Maps the options a fixture was written with onto the current ones
 */
function toInit (fixture: LegacyKeychain): KeychainInit {
  const dek = fixture.init.dek

  return {
    password: fixture.init.pass,
    salt: dek?.salt,
    iterations: dek?.iterationCount,
    legacyDek: dek == null ? undefined : { keyLength: dek.keyLength, hash: dek.hash as LegacyDek['hash'] }
  }
}

export function open (datastore: Datastore, fixture: LegacyKeychain, overrides: KeychainInit = {}): Keychain {
  return new Keychain({ datastore, getCrypto: createCryptoLoader([secp256k1Crypto()]) }, { ...toInit(fixture), ...overrides })
}

function byName (keys: Array<Pick<KeyInfo, 'name' | 'id'>>): Array<Pick<KeyInfo, 'name' | 'id'>> {
  return keys.map(({ name, id }) => ({ name, id })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function expectKeys (keychain: Keychain, fixture: LegacyKeychain): Promise<void> {
  expect(byName(await all(keychain.listKeys()))).to.deep.equal(byName(fixture.keys))

  for (const expected of fixture.keys) {
    const key = await keychain.exportKey(expected.name)
    const data = uint8ArrayFromString('hello world')

    expect(key.type).to.equal(expected.type)
    expect(uint8ArrayToString(key.publicKey.toProtobuf(), 'base64')).to.equal(expected.publicKey)
    expect(await key.publicKey.verify(data, await key.sign(data))).to.be.true()
  }
}

const PRF_HASHES: Record<string, 'SHA-256' | 'SHA-384' | 'SHA-512'> = {
  '1.2.840.113549.2.9': 'SHA-256',
  '1.2.840.113549.2.10': 'SHA-384',
  '1.2.840.113549.2.11': 'SHA-512'
}

function toNumber (buf: Uint8Array): number {
  return buf.reduce((acc, byte) => acc * 256 + byte, 0)
}

/**
 * Replaces the encrypted content of a legacy PEM with `plainText`, keeping its
 * salt, iv and key derivation. `plainText` must pad to the same length.
 */
export async function reencryptPem (dek: string, pem: string, plainText: Uint8Array): Promise<string> {
  const body = pem
    .replaceAll('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
    .replaceAll('-----END ENCRYPTED PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '')
  const der = base64.decode(`m${body}`)
  const params = decodeDer(der)[0][1][0][1]
  const keyBytes = await pbkdf2Bytes(uint8ArrayFromString(dek), params[0], toNumber(params[1]), PRF_HASHES[params[3][0]], toNumber(params[2]) * 8)
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt'])
  const cipherText = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(params[4][1]) }, key, new Uint8Array(plainText)))

  expect(cipherText.byteLength).to.equal(params[4][2].byteLength)
  der.set(cipherText, der.byteLength - cipherText.byteLength)

  return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${base64.baseEncode(der)}\n-----END ENCRYPTED PRIVATE KEY-----\n`
}

export const RSA_OID = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]
export const EC_OID = [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]

export function tlv (tag: number, content: Uint8Array): Uint8Array {
  const length = content.byteLength < 0x80 ? [content.byteLength] : [0x82, content.byteLength >> 8, content.byteLength & 0xff]

  return uint8ArrayConcat([Uint8Array.from([tag, ...length]), content])
}

/**
 * A PKCS#8 PrivateKeyInfo for `oid` holding `privateKey`
 */
export function pkcs8 (oid: number[], privateKey: Uint8Array): Uint8Array {
  return tlv(0x30, uint8ArrayConcat([
    Uint8Array.from([0x02, 0x01, 0x00]),
    tlv(0x30, Uint8Array.from([0x06, oid.length, ...oid, 0x05, 0x00])),
    tlv(0x04, privateKey)
  ]))
}

function pemCipherTextLength (pem: string): number {
  const body = pem
    .replaceAll('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
    .replaceAll('-----END ENCRYPTED PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '')

  return decodeDer(base64.decode(`m${body}`))[0][1][0][1][4][2].byteLength
}

/**
 * Random bytes that pad to the same AES-CBC length as the plaintext of `pem`
 */
export function garbageFor (pem: string): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(pemCipherTextLength(pem) - 1))
}

/**
 * A well formed PrivateKeyInfo for a non-RSA key that pads to the same AES-CBC
 * length as the plaintext of `pem`
 */
export function notRsaFor (pem: string): Uint8Array {
  // 24 bytes of PrivateKeyInfo framing around the private key
  const info = pkcs8(EC_OID, crypto.getRandomValues(new Uint8Array(pemCipherTextLength(pem) - 1 - 24)))

  expect(info.byteLength).to.equal(pemCipherTextLength(pem) - 1)

  return info
}
