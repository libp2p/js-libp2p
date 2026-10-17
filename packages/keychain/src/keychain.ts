import { PrivateKeyMessage, PublicKeyMessage } from '@ipshipyard/crypto/pb'
import { Key } from 'interface-datastore/key'
import { base58btc } from 'multiformats/bases/base58'
import { base64 } from 'multiformats/bases/base64'
import { sha256 } from 'multiformats/hashes/sha2'
import sanitize from 'sanitize-filename'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { DecryptionFailedError, InvalidParametersError } from './errors.ts'
import { privateKeyFromPEM } from './legacy.ts'
import type { Keychain as KeychainInterface, KeyInfo, GenerateKeyOptions, KeychainComponents, KeychainInit, Cipher, EncryptionResult, CipherOptions } from './index.ts'
import type { Crypto, PrivateKey, PublicKey } from '@ipshipyard/crypto'
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
  hash: 'SHA-512',
  algorithm: 'AES-GCM'
}

/**
 * Each private key is encrypted at rest with a  Data Encryption Key created
 * from these parameters.
 *
 * Inherited from js-libp2p.
 */
const PRIVATE_KEY_DEK_INIT = {
  iterations: 32_767,
  saltLength: 16,
  ivLength: 12,
  hash: 'SHA-256',
  keyLength: 128,
  algorithm: 'AES-GCM'
}

const MIN_PASS_LENGTH = 20

// NIST SP 800-132
const NIST = {
  minKeyLength: 112 / 8,
  minSaltLength: 128 / 8,
  minIterations: 1_000
}

const KEY_LENGTHS: Record<string, number> = {
  'SHA-256': 128,
  'SHA-384': 192,
  'SHA-512': 256
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
  private readonly self: string
  private cipher: Cipher
  private salt: Uint8Array<ArrayBuffer>
  private keychainDekOptions: DeriveKeyOptions
  private privateKeyDekOptions: PrivateKeyDeriveKeyOptions

  /**
   * Creates a new instance of a key chain
   */
  constructor (components: KeychainComponents, init: KeychainInit = {}) {
    this.components = components
    this.self = init.selfKey ?? 'self'
    this.salt = getSalt(init.salt) ?? KEYCHAIN_DEK_INIT.salt

    this.keychainDekOptions = {
      iterations: init.iterations ?? KEYCHAIN_DEK_INIT.iterations,
      hash: init.hash ?? KEYCHAIN_DEK_INIT.hash,
      keyLength: KEY_LENGTHS[init.hash ?? KEYCHAIN_DEK_INIT.hash],
      algorithm: KEYCHAIN_DEK_INIT.algorithm
    }
    this.privateKeyDekOptions = {
      iterations: PRIVATE_KEY_DEK_INIT.iterations,
      hash: PRIVATE_KEY_DEK_INIT.hash,
      saltLength: PRIVATE_KEY_DEK_INIT.saltLength,
      ivLength: PRIVATE_KEY_DEK_INIT.ivLength,
      keyLength: PRIVATE_KEY_DEK_INIT.keyLength,
      algorithm: PRIVATE_KEY_DEK_INIT.algorithm
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
    if (this.salt.byteLength != null && this.salt.byteLength < NIST.minSaltLength) {
      throw new Error(`salt must be least ${NIST.minSaltLength} bytes`)
    }

    if (init.iterations != null && init.iterations < NIST.minIterations) {
      throw new Error(`iterations must be least ${NIST.minIterations}`)
    }

    if (KEY_LENGTHS[this.keychainDekOptions.hash] == null) {
      throw new InvalidParametersError('Unsupported hash')
    }

    this.cipher = createAESCipher(init.password ?? '', this.salt, this.keychainDekOptions, this.privateKeyDekOptions)
  }

  readonly [serviceCapabilities]: string[] = [
    '@ipshipyard/keychain'
  ]

  async generateKey (name: string, options?: GenerateKeyOptions): Promise<PrivateKey> {
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

    const exists = await this.components.datastore.has(dsName(name), options)

    if (exists) {
      throw new InvalidParametersError(`Key '${name}' already exists`)
    }

    const batch = this.components.datastore.batch()
    await this._importKey(name, key, this.cipher, batch, options)
    await batch.commit(options)

    return key
  }

  private async _importKey (name: string, privateKey: PrivateKey, cipher: Cipher, batch: Batch, options?: AbortOptions): Promise<void> {
    const pb = privateKey.toProtobuf()
    const result = await cipher.encrypt(pb)
    const cipherText = uint8ArrayConcat([
      result.salt,
      result.iv,
      result.cipherText
    ], result.salt.byteLength + result.iv.byteLength + result.cipherText.byteLength)
    const encodedText = base64.encode(cipherText)

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

    return this._exportKey(name, this.cipher, options)
  }

  private async _exportKey (name: string, cipher: Cipher, options?: AbortOptions): Promise<PrivateKey> {
    const keyBuf = await this.components.datastore.get(dsName(name), options)
    const keyText = uint8ArrayToString(keyBuf)
    let cryptoImpl: Crypto | undefined

    // if the stored key is encrypted PEM it's legacy RSA, otherwise derive
    // from the protobuf data
    if (keyText.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
      return privateKeyFromPEM(keyText, cipher, options)
    }

    try {
      const decoded = base64.decode(keyText)
      const salt = decoded.subarray(0, 16)
      const iv = decoded.subarray(16, 16 + 12)
      const cipherText = decoded.subarray(16 + 12)
      const plainText = await cipher.decrypt(salt, iv, cipherText, options)
      const pb = PrivateKeyMessage.decode(plainText)

      if (pb.Type == null) {
        throw new DecryptionFailedError('Unknown key type')
      }

      cryptoImpl = await this.components.getCrypto(pb.Type, options)
      return await cryptoImpl.privateKeyFromProtobuf(plainText)
    } catch (err: any) {
      if (err.name === 'OperationError') {
        throw new DecryptionFailedError(err.message)
      }

      throw err
    }
  }

  async removeKey (name: string, options?: AbortOptions): Promise<void> {
    if (!validateKeyName(name) || name === this.self) {
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const batch = this.components.datastore.batch()
    batch.delete(dsName(name))
    batch.delete(dsInfoName(name))
    await batch.commit(options)
  }

  /**
   * List all the keys
   */
  async * listKeys (options?: AbortOptions): AsyncGenerator <KeyInfo> {
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

    const oldCipher = this.cipher
    const newCipher = this.cipher = createAESCipher(password, this.salt, this.keychainDekOptions, this.privateKeyDekOptions)

    const batch = this.components.datastore.batch()

    for await (const info of this.listKeys(options)) {
      const key = await this._exportKey(info.name, oldCipher)

      // Update stored key
      await this._importKey(info.name, key, newCipher, batch, options)
    }

    await batch.commit(options)
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

/**
 * WebKit on Linux does not support deriving a key from an empty PBKDF2 key.
 * So, as a workaround, we provide the generated key as a constant.
 *
 * Generated via:
 *
 * ```ts
 * const key = await crypto.subtle.importKey('raw', new Uint8Array(0), {
 *   name: 'PBKDF2'
 * }, false, ['deriveKey'])
 *
 * const derivedKey = await crypto.subtle.deriveKey({
 *   name: 'PBKDF2',
 *   salt: new Uint8Array(16),
 *   iterations: 32767,
 *   hash: {
 *     name: 'SHA-256'
 *   }
 * }, key, {
 *   name: 'AES-GCM',
 *   length: 128
 * }, true, ['encrypt', 'decrypt'])
 *
 * const jwk = await crypto.subtle.exportKey('jwk', derivedKey)
 * ```
 */
const derivedEmptyPasswordKey = {
  alg: 'A128GCM',
  ext: true,
  /* spell-checker:disable-next-line */
  k: 'scm9jmO_4BJAgdwWGVulLg',
  key_ops: ['encrypt', 'decrypt'],
  kty: 'oct'
}

interface DeriveKeyOptions {
  iterations: number
  hash: string
  keyLength: number
  algorithm: string
}

interface PrivateKeyDeriveKeyOptions extends DeriveKeyOptions {
  /**
   * A random salt will be generated of this many bytes
   *
   * @default 16
   */
  saltLength: number

  /**
   * A random initialization vector will be generated of this many bytes
   *
   * @default 12
   */
  ivLength: number
}

// Based on code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

function createAESCipher (password: string, salt: Uint8Array<ArrayBuffer>, keychainDekOpts: DeriveKeyOptions, privateKeyDekOpts: PrivateKeyDeriveKeyOptions): Cipher {
  let keychainDek: string | undefined

  async function deriveKey (password: string, salt: Uint8Array, usages: KeyUsage[], opts: DeriveKeyOptions): Promise<CryptoKey> {
    let cryptoKey: CryptoKey
    const pass = uint8ArrayFromString(password)
    const rawKey = await crypto.subtle.importKey('raw', pass, {
      name: 'PBKDF2'
    }, false, ['deriveKey'])

    try {
      cryptoKey = await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: withArrayBuffer(salt),
        iterations: opts.iterations,
        hash: {
          name: opts.hash
        }
      }, rawKey, {
        name: opts.algorithm ?? 'AES-GCM',
        length: opts.keyLength
      }, true, usages)
    } catch (err) {
      if (password === '') {
        cryptoKey = await crypto.subtle.importKey('jwk', derivedEmptyPasswordKey, {
          name: opts.algorithm ?? 'AES-GCM'
        }, true, usages)
      } else {
        throw err
      }
    }

    return cryptoKey
  }

  async function createKeychainDek (): Promise<string> {
    if (password === '') {
      return password
    }

    const key = await deriveKey(password, salt, ['encrypt', 'decrypt'], keychainDekOpts)
    const jwk = await crypto.subtle.exportKey('jwk', key)

    return jwk.k ?? ''
  }

  /**
   * Encrypt data using the derived encryption key
   */
  async function encrypt (data: Uint8Array<ArrayBuffer>, opts?: AbortOptions): Promise<EncryptionResult> {
    if (keychainDek == null) {
      keychainDek = await createKeychainDek()
    }

    const salt = crypto.getRandomValues(new Uint8Array(privateKeyDekOpts.saltLength))
    const iv = crypto.getRandomValues(new Uint8Array(privateKeyDekOpts.ivLength))
    const cryptoKey = await deriveKey(keychainDek, salt, ['encrypt'], privateKeyDekOpts)
    const ciphertext = await crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv
    }, cryptoKey, data)

    opts?.signal?.throwIfAborted()

    return {
      salt,
      iv,
      cipherText: new Uint8Array(ciphertext)
    }
  }

  /**
   * Decrypt data using the derived encryption key
   */
  async function decrypt (salt: Uint8Array, iv: Uint8Array, cipherText: Uint8Array, opts?: CipherOptions): Promise<Uint8Array<ArrayBuffer>> {
    if (keychainDek == null) {
      keychainDek = await createKeychainDek()
    }

    const cryptoKey = await deriveKey(keychainDek, salt, ['decrypt'], {
      iterations: opts?.iterations ?? privateKeyDekOpts.iterations,
      keyLength: opts?.keyLength ?? privateKeyDekOpts.keyLength,
      hash: opts?.hash ?? privateKeyDekOpts.hash,
      algorithm: opts?.algorithm ?? 'AES-GCM'
    })

    const plaintext = await crypto.subtle.decrypt({
      name: opts?.algorithm ?? 'AES-GCM',
      iv: withArrayBuffer(iv)
    }, cryptoKey, withArrayBuffer(cipherText))

    opts?.signal?.throwIfAborted()

    return new Uint8Array(plaintext)
  }

  return {
    encrypt,
    decrypt
  }
}
