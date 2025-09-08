import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { x25519 } from '@noble/curves/ed25519'
import { extract, expand } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha2'
import type { ICryptoInterface } from '../crypto.js'
import type { KeyPair } from '../types.js'
import type { Uint8ArrayList } from 'uint8arraylist'

export const pureJsCrypto: ICryptoInterface = {
  hashSHA256 (data: Uint8Array | Uint8ArrayList): Uint8Array {
    return sha256(data.subarray())
  },

  getHKDF (ck: Uint8Array, ikm: Uint8Array): [Uint8Array, Uint8Array, Uint8Array] {
    const prk = extract(sha256, ikm, ck)
    const okmU8Array = expand(sha256, prk, undefined, 96)
    const okm = okmU8Array

    const k1 = okm.subarray(0, 32)
    const k2 = okm.subarray(32, 64)
    const k3 = okm.subarray(64, 96)

    return [k1, k2, k3]
  },

  generateX25519KeyPair (): KeyPair {
    const secretKey = x25519.utils.randomSecretKey()
    const publicKey = x25519.getPublicKey(secretKey)

    return {
      publicKey,
      privateKey: secretKey
    }
  },

  generateX25519KeyPairFromSeed (seed: Uint8Array): KeyPair {
    const publicKey = x25519.getPublicKey(seed)

    return {
      publicKey,
      privateKey: seed
    }
  },

  generateX25519SharedKey (privateKey: Uint8Array | Uint8ArrayList, publicKey: Uint8Array | Uint8ArrayList): Uint8Array {
    return x25519.getSharedSecret(privateKey.subarray(), publicKey.subarray())
  },

  chaCha20Poly1305Encrypt (plaintext: Uint8Array | Uint8ArrayList, nonce: Uint8Array, ad: Uint8Array, k: Uint8Array): Uint8Array {
    return chacha20poly1305(k, nonce, ad).encrypt(plaintext.subarray())
  },

  chaCha20Poly1305Decrypt (ciphertext: Uint8Array | Uint8ArrayList, nonce: Uint8Array, ad: Uint8Array, k: Uint8Array, dst?: Uint8Array): Uint8Array {
    return chacha20poly1305(k, nonce, ad).decrypt(ciphertext.subarray(), dst)
  }
}
