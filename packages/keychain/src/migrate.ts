import { privateKeyFromProtobuf } from '@libp2p/crypto'
import { Key } from 'interface-datastore/key'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { decryptEntry, encryptEntry } from './cipher.ts'
import { KeychainMigrationError } from './errors.ts'
import { decryptPem, isPem } from './legacy.ts'
import type { CryptoLoader } from './index.ts'
import type { AbortOptions } from 'abort-error'
import type { Datastore } from 'interface-datastore'

export const META_KEY = new Key('/keychain/meta')

export interface Meta {
  version: 2
}

async function tryDecrypt (dek: string, text: string): Promise<Uint8Array | undefined> {
  try {
    return isPem(text) ? await decryptPem(dek, text) : await decryptEntry(dek, text)
  } catch {
    return undefined
  }
}

/**
 * Decrypts with the legacy key and checks the result is a key the configured
 * cryptos can load, so a lucky wrong-password decryption is never rewritten
 */
async function tryDecryptLegacy (dek: string, text: string, getCrypto: CryptoLoader, options?: AbortOptions): Promise<Uint8Array | undefined> {
  const plainText = await tryDecrypt(dek, text)

  if (plainText == null) {
    return undefined
  }

  try {
    await privateKeyFromProtobuf(plainText, { ...options, getCrypto })
  } catch {
    options?.signal?.throwIfAborted()

    return undefined
  }

  return plainText
}

/**
 * Re-encrypts entries written by previous versions under `target`, then
 * records the new version. Entries already readable with `target` are left
 * alone so an interrupted run resumes.
 */
export async function migrate (datastore: Datastore, target: string, legacy: string, getCrypto: CryptoLoader, options?: AbortOptions): Promise<void> {
  if (await datastore.has(META_KEY, options)) {
    return
  }

  const rewrites: Array<[Key, Uint8Array]> = []

  for await (const { key, value } of datastore.query({ prefix: '/pkcs8/' }, options)) {
    const text = uint8ArrayToString(value)

    if (!isPem(text) && (await tryDecrypt(target, text)) != null) {
      continue
    }

    const plainText = await tryDecryptLegacy(legacy, text, getCrypto, options)

    if (plainText == null) {
      throw new KeychainMigrationError(`Could not decrypt key "${key.baseNamespace()}", check the password and legacyDek options`)
    }

    rewrites.push([key, uint8ArrayFromString(await encryptEntry(target, plainText))])
  }

  if (rewrites.length > 0) {
    const batch = datastore.batch()

    for (const [key, value] of rewrites) {
      batch.put(key, value)
    }

    await batch.commit(options)
  }

  const meta: Meta = { version: 2 }
  await datastore.put(META_KEY, uint8ArrayFromString(JSON.stringify(meta)), options)
}
