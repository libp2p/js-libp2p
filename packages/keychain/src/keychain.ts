import { PrivateKeyMessage, PublicKeyMessage } from '@libp2p/crypto/pb'
import { Key } from 'interface-datastore/key'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import { raceSignal } from 'race-signal'
import sanitize from 'sanitize-filename'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { KEY_LENGTHS, decryptEntry, deriveDek, encryptEntry } from './cipher.ts'
import { DecryptionFailedError, InvalidParametersError } from './errors.ts'
import { DEFAULT_LEGACY_DEK, deriveLegacyDek } from './legacy.ts'
import { migrate } from './migrate.ts'
import type { DekOptions } from './cipher.ts'
import type { Keychain as KeychainInterface, KeyInfo, GenerateKeyOptions, KeychainComponents, KeychainInit } from './index.ts'
import type { PrivateKey, PublicKey } from '@libp2p/crypto'
import type { AbortOptions } from 'abort-error'
import type { Batch } from 'interface-datastore'

const keyPrefix = '/pkcs8/'
const infoPrefix = '/info/'

const serviceCapabilities = Symbol.for('@libp2p/service-capabilities')

/**
 * Default options for key derivation for the keychain Data Encryption Key.
 *
 * Inherited from js-libp2p.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
 */
const KEYCHAIN_DEK_INIT = {
  iterations: 10_000,
  salt: uint8ArrayFromString('you should override this value with a crypto secure random number'),
  hash: 'SHA-512'
} as const

const MIN_PASS_LENGTH = 20

// NIST SP 800-132
const NIST = {
  minKeyLength: 112 / 8,
  minSaltLength: 128 / 8,
  minIterations: 1_000
}

function validateKeyName (name: string): boolean {
  if (name == null) {
    return false
  }

  if (typeof name !== 'string') {
    return false
  }

  return name === sanitize(name.trim()) && name.length > 0
}

/**
 * Converts a key name into a datastore name
 */
function dsName (name: string): Key {
  return new Key(keyPrefix + name)
}

/**
 * Converts a key name into a datastore info name
 */
function dsInfoName (name: string): Key {
  return new Key(infoPrefix + name)
}

async function keyId (key: PrivateKey, options?: AbortOptions): Promise<string> {
  const pb = key.toProtobuf()
  const hash = await sha256.digest(pb)

  options?.signal?.throwIfAborted()

  return base58btc.encode(hash.bytes).substring(1)
}

function getSalt (salt?: string | Uint8Array): Uint8Array<ArrayBuffer> | undefined {
  if (typeof salt === 'string') {
    return uint8ArrayFromString(salt)
  }

  if (salt instanceof Uint8Array) {
    return withArrayBuffer(salt)
  }
}

/**
 * Manages the life cycle of a key. Keys are encrypted at rest using PKCS #8.
 *
 * A key in the store has two entries
 * - '/info/*key-name*', contains the KeyInfo for the key
 * - '/pkcs8/*key-name*', contains the PKCS #8 for the key
 */
export class Keychain implements KeychainInterface {
  private readonly components: KeychainComponents
  private readonly init: KeychainInit
  private readonly self: string
  private readonly dekOptions: DekOptions
  private dek?: string
  private opening?: Promise<void>

  /**
   * Creates a new instance of a key chain
   */
  constructor (components: KeychainComponents, init: KeychainInit = {}) {
    this.components = components
    this.init = init
    this.self = init.selfKey ?? 'self'
    this.dekOptions = {
      salt: getSalt(init.salt) ?? KEYCHAIN_DEK_INIT.salt,
      iterations: init.iterations ?? KEYCHAIN_DEK_INIT.iterations,
      hash: init.hash ?? KEYCHAIN_DEK_INIT.hash
    }

    // Enforce NIST SP 800-132
    if (init.password != null && init.password.length < MIN_PASS_LENGTH) {
      throw new Error('password must be least 20 characters')
    }
    /*
    if (this.keyLength < NIST.minKeyLength) {
      throw new Error(`dek.keyLength must be least ${NIST.minKeyLength} bytes`)
    }
*/
    if (this.dekOptions.salt.byteLength < NIST.minSaltLength) {
      throw new Error(`salt must be least ${NIST.minSaltLength} bytes`)
    }

    if (init.iterations != null && init.iterations < NIST.minIterations) {
      throw new Error(`iterations must be least ${NIST.minIterations}`)
    }

    if (KEY_LENGTHS[this.dekOptions.hash] == null) {
      throw new InvalidParametersError('Unsupported hash')
    }
  }

  /**
   * Migrates entries written by previous versions on first use. Concurrent
   * callers share one run, and a failed run is retried by the next caller.
   */
  private async ready (options?: AbortOptions): Promise<string> {
    this.opening ??= this.open().catch(err => {
      this.opening = undefined
      throw err
    })

    await raceSignal(this.opening, options?.signal)

    if (this.dek == null) {
      throw new Error('Keychain did not open')
    }

    return this.dek
  }

  private async open (): Promise<void> {
    const target = await deriveDek(this.init.password ?? '', this.dekOptions)
    const legacy = deriveLegacyDek(this.init.password, this.dekOptions.salt, this.dekOptions.iterations, this.init.legacyDek ?? DEFAULT_LEGACY_DEK)

    await migrate(this.components.datastore, target, legacy, this.components.getCrypto)
    this.dek = target
  }

  readonly [Symbol.toStringTag] = '@libp2p/keychain'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/keychain'
  ]

  async generateKey (name: string, options?: GenerateKeyOptions): Promise<PrivateKey> {
    await this.ready(options)
    const crypto = await this.components.getCrypto(options?.type ?? 'Ed25519', options)
    const key = await crypto.generatePrivateKey(options)

    return this.importKey(name, key, options)
  }

  async importKey (name: string, key: PrivateKey, options?: AbortOptions): Promise<PrivateKey> {
    if (!validateKeyName(name)) {
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    if (key == null) {
      throw new InvalidParametersError('Key is required')
    }

    const dek = await this.ready(options)
    const exists = await this.components.datastore.has(dsName(name), options)

    if (exists) {
      throw new InvalidParametersError(`Key '${name}' already exists`)
    }

    const batch = this.components.datastore.batch()
    await this._importKey(name, key, dek, batch, options)
    await batch.commit(options)

    return key
  }

  private async _importKey (name: string, privateKey: PrivateKey, dek: string, batch: Batch, options?: AbortOptions): Promise<void> {
    const encodedText = await encryptEntry(dek, privateKey.toProtobuf())

    options?.signal?.throwIfAborted()

    const keyInfo: KeyInfo = {
      name,
      id: await keyId(privateKey, options)
    }

    batch.put(dsName(name), uint8ArrayFromString(encodedText))
    batch.put(dsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
  }

  async exportKey (name: string, options?: AbortOptions): Promise<PrivateKey> {
    if (!validateKeyName(name)) {
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const dek = await this.ready(options)

    return this._exportKey(name, dek, options)
  }

  private async _exportKey (name: string, dek: string, options?: AbortOptions): Promise<PrivateKey> {
    const keyBuf = await this.components.datastore.get(dsName(name), options)
    const plainText = await decryptEntry(dek, uint8ArrayToString(keyBuf))
    options?.signal?.throwIfAborted()
    const pb = PrivateKeyMessage.decode(plainText)

    if (pb.Type == null) {
      throw new DecryptionFailedError('Unknown key type')
    }

    const crypto = await this.components.getCrypto(pb.Type, options)

    return crypto.privateKeyFromProtobuf(plainText, options)
  }

  async removeKey (name: string, options?: AbortOptions): Promise<void> {
    if (!validateKeyName(name) || name === this.self) {
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    await this.ready(options)

    const batch = this.components.datastore.batch()
    batch.delete(dsName(name))
    batch.delete(dsInfoName(name))
    await batch.commit(options)
  }

  /**
   * List all the keys
   */
  async * listKeys (options?: AbortOptions): AsyncGenerator <KeyInfo> {
    await this.ready(options)

    const query = {
      prefix: infoPrefix
    }

    for await (const value of this.components.datastore.query(query, options)) {
      yield JSON.parse(uint8ArrayToString(value.value))
    }
  }

  /**
   * Rename a key
   *
   * @param {string} oldName - The old local key name; must already exist.
   * @param {string} newName - The new local key name; must not already exist.
   * @returns {Promise<KeyInfo>}
   */
  async renameKey (oldName: string, newName: string, options?: AbortOptions): Promise<void> {
    if (!validateKeyName(oldName) || oldName === this.self) {
      throw new InvalidParametersError(`Invalid old key name '${oldName}'`)
    }

    if (!validateKeyName(newName) || newName === this.self) {
      throw new InvalidParametersError(`Invalid new key name '${newName}'`)
    }

    await this.ready(options)

    const oldDatastoreName = dsName(oldName)
    const newDatastoreName = dsName(newName)
    const oldInfoName = dsInfoName(oldName)
    const newInfoName = dsInfoName(newName)

    const exists = await this.components.datastore.has(newDatastoreName, options)

    if (exists) {
      throw new InvalidParametersError(`Key '${newName}' already exists`)
    }

    const pem = await this.components.datastore.get(oldDatastoreName, options)
    const res = await this.components.datastore.get(oldInfoName, options)

    const keyInfo: KeyInfo = JSON.parse(uint8ArrayToString(res))
    keyInfo.name = newName

    const batch = this.components.datastore.batch()
    batch.put(newDatastoreName, pem)
    batch.put(newInfoName, uint8ArrayFromString(JSON.stringify(keyInfo)))
    batch.delete(oldDatastoreName)
    batch.delete(oldInfoName)

    await batch.commit(options)
  }

  /**
   * Rotate keychain password and re-encrypt all associated keys
   */
  async rotateKeychainPass (password: string, options?: AbortOptions): Promise<void> {
    if (typeof password !== 'string') {
      throw new InvalidParametersError(`Invalid new pass type '${typeof password}'`)
    }

    if (password.length < MIN_PASS_LENGTH) {
      throw new InvalidParametersError(`Invalid pass length ${password.length}, must be at least ${MIN_PASS_LENGTH}`)
    }

    const oldDek = await this.ready(options)
    const newDek = await deriveDek(password, this.dekOptions)

    const batch = this.components.datastore.batch()

    for await (const info of this.listKeys(options)) {
      const key = await this._exportKey(info.name, oldDek, options)

      // Update stored key
      await this._importKey(info.name, key, newDek, batch, options)
    }

    await batch.commit(options)
    this.dek = newDek
  }

  async loadPublicKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PublicKey> {
    const pb = PublicKeyMessage.decode(buf)

    if (pb.Type == null) {
      throw new InvalidParametersError('Protobuf was missing Type')
    }

    const crypto = await this.components.getCrypto(pb.Type, options)

    return crypto.publicKeyFromProtobuf(buf, options)
  }
}
