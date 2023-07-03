import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { ChaCha20Poly1305 } from '@stablelib/chacha20poly1305'
import * as x25519 from '@stablelib/x25519'
import type { bytes, bytes32 } from '../@types/basic.js'
import type { Hkdf } from '../@types/handshake.js'
import type { KeyPair } from '../@types/libp2p.js'
import type { ICryptoInterface } from '../crypto.js'

export const pureJsCrypto: ICryptoInterface = {
  hashSHA256 (data: Uint8Array): Uint8Array {
    return sha256(data)
  },

  getHKDF (ck: bytes32, ikm: Uint8Array): Hkdf {
    const okm = hkdf(sha256, ikm, ck, undefined, 96)

    const k1 = okm.subarray(0, 32)
    const k2 = okm.subarray(32, 64)
    const k3 = okm.subarray(64, 96)

    return [k1, k2, k3]
  },

  generateX25519KeyPair (): KeyPair {
    const keypair = x25519.generateKeyPair()

    return {
      publicKey: keypair.publicKey,
      privateKey: keypair.secretKey
    }
  },

  generateX25519KeyPairFromSeed (seed: Uint8Array): KeyPair {
    const keypair = x25519.generateKeyPairFromSeed(seed)

    return {
      publicKey: keypair.publicKey,
      privateKey: keypair.secretKey
    }
  },

  generateX25519SharedKey (privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    return x25519.sharedKey(privateKey, publicKey)
  },

  chaCha20Poly1305Encrypt (plaintext: Uint8Array, nonce: Uint8Array, ad: Uint8Array, k: bytes32): bytes {
    const ctx = new ChaCha20Poly1305(k)

    return ctx.seal(nonce, plaintext, ad)
  },

  chaCha20Poly1305Decrypt (ciphertext: Uint8Array, nonce: Uint8Array, ad: Uint8Array, k: bytes32, dst?: Uint8Array): bytes | null {
    const ctx = new ChaCha20Poly1305(k)

    return ctx.open(nonce, ciphertext, ad, dst)
  }
}
