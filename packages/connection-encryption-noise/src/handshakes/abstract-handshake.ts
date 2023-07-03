import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { logger } from '../logger.js'
import { Nonce } from '../nonce.js'
import type { bytes, bytes32 } from '../@types/basic.js'
import type { CipherState, MessageBuffer, SymmetricState } from '../@types/handshake.js'
import type { ICryptoInterface } from '../crypto.js'

export interface DecryptedResult {
  plaintext: bytes
  valid: boolean
}

export interface SplitState {
  cs1: CipherState
  cs2: CipherState
}

export abstract class AbstractHandshake {
  public crypto: ICryptoInterface

  constructor (crypto: ICryptoInterface) {
    this.crypto = crypto
  }

  public encryptWithAd (cs: CipherState, ad: Uint8Array, plaintext: Uint8Array): bytes {
    const e = this.encrypt(cs.k, cs.n, ad, plaintext)
    cs.n.increment()

    return e
  }

  public decryptWithAd (cs: CipherState, ad: Uint8Array, ciphertext: Uint8Array, dst?: Uint8Array): DecryptedResult {
    const { plaintext, valid } = this.decrypt(cs.k, cs.n, ad, ciphertext, dst)
    if (valid) cs.n.increment()

    return { plaintext, valid }
  }

  // Cipher state related
  protected hasKey (cs: CipherState): boolean {
    return !this.isEmptyKey(cs.k)
  }

  protected createEmptyKey (): bytes32 {
    return new Uint8Array(32)
  }

  protected isEmptyKey (k: bytes32): boolean {
    const emptyKey = this.createEmptyKey()
    return uint8ArrayEquals(emptyKey, k)
  }

  protected encrypt (k: bytes32, n: Nonce, ad: Uint8Array, plaintext: Uint8Array): bytes {
    n.assertValue()

    return this.crypto.chaCha20Poly1305Encrypt(plaintext, n.getBytes(), ad, k)
  }

  protected encryptAndHash (ss: SymmetricState, plaintext: bytes): bytes {
    let ciphertext
    if (this.hasKey(ss.cs)) {
      ciphertext = this.encryptWithAd(ss.cs, ss.h, plaintext)
    } else {
      ciphertext = plaintext
    }

    this.mixHash(ss, ciphertext)
    return ciphertext
  }

  protected decrypt (k: bytes32, n: Nonce, ad: bytes, ciphertext: bytes, dst?: Uint8Array): DecryptedResult {
    n.assertValue()

    const encryptedMessage = this.crypto.chaCha20Poly1305Decrypt(ciphertext, n.getBytes(), ad, k, dst)

    if (encryptedMessage) {
      return {
        plaintext: encryptedMessage,
        valid: true
      }
    } else {
      return {
        plaintext: new Uint8Array(0),
        valid: false
      }
    }
  }

  protected decryptAndHash (ss: SymmetricState, ciphertext: bytes): DecryptedResult {
    let plaintext: bytes; let valid = true
    if (this.hasKey(ss.cs)) {
      ({ plaintext, valid } = this.decryptWithAd(ss.cs, ss.h, ciphertext))
    } else {
      plaintext = ciphertext
    }

    this.mixHash(ss, ciphertext)
    return { plaintext, valid }
  }

  protected dh (privateKey: bytes32, publicKey: bytes32): bytes32 {
    try {
      const derivedU8 = this.crypto.generateX25519SharedKey(privateKey, publicKey)

      if (derivedU8.length === 32) {
        return derivedU8
      }

      return derivedU8.subarray(0, 32)
    } catch (e) {
      const err = e as Error
      logger.error(err)
      return new Uint8Array(32)
    }
  }

  protected mixHash (ss: SymmetricState, data: bytes): void {
    ss.h = this.getHash(ss.h, data)
  }

  protected getHash (a: Uint8Array, b: Uint8Array): bytes32 {
    const u = this.crypto.hashSHA256(uint8ArrayConcat([a, b], a.length + b.length))
    return u
  }

  protected mixKey (ss: SymmetricState, ikm: bytes32): void {
    const [ck, tempK] = this.crypto.getHKDF(ss.ck, ikm)
    ss.cs = this.initializeKey(tempK)
    ss.ck = ck
  }

  protected initializeKey (k: bytes32): CipherState {
    return { k, n: new Nonce() }
  }

  // Symmetric state related

  protected initializeSymmetric (protocolName: string): SymmetricState {
    const protocolNameBytes = uint8ArrayFromString(protocolName, 'utf-8')
    const h = this.hashProtocolName(protocolNameBytes)

    const ck = h
    const key = this.createEmptyKey()
    const cs: CipherState = this.initializeKey(key)

    return { cs, ck, h }
  }

  protected hashProtocolName (protocolName: Uint8Array): bytes32 {
    if (protocolName.length <= 32) {
      const h = new Uint8Array(32)
      h.set(protocolName)
      return h
    } else {
      return this.getHash(protocolName, new Uint8Array(0))
    }
  }

  protected split (ss: SymmetricState): SplitState {
    const [tempk1, tempk2] = this.crypto.getHKDF(ss.ck, new Uint8Array(0))
    const cs1 = this.initializeKey(tempk1)
    const cs2 = this.initializeKey(tempk2)

    return { cs1, cs2 }
  }

  protected writeMessageRegular (cs: CipherState, payload: bytes): MessageBuffer {
    const ciphertext = this.encryptWithAd(cs, new Uint8Array(0), payload)
    const ne = this.createEmptyKey()
    const ns = new Uint8Array(0)

    return { ne, ns, ciphertext }
  }

  protected readMessageRegular (cs: CipherState, message: MessageBuffer): DecryptedResult {
    return this.decryptWithAd(cs, new Uint8Array(0), message.ciphertext)
  }
}
