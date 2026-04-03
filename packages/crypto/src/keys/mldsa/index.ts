import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'
import { SigningError, VerificationError } from '../../errors.js'
import type { MLDSAVariant, AbortOptions } from '@libp2p/interface'
import type { Uint8ArrayKeyPair } from '../interface.js'
import type { Uint8ArrayList } from 'uint8arraylist'

const variants = {
  MLDSA44: ml_dsa44,
  MLDSA65: ml_dsa65,
  MLDSA87: ml_dsa87
} as const

export const mldsaVariants = Object.keys(variants) as MLDSAVariant[]
export const defaultMLDSAVariant: MLDSAVariant = 'MLDSA65'

export function isMLDSAVariant (variant: string): variant is MLDSAVariant {
  return variant === 'MLDSA44' || variant === 'MLDSA65' || variant === 'MLDSA87'
}

export function getMLDSA (variant: MLDSAVariant): (typeof variants)[MLDSAVariant] {
  return variants[variant]
}

export function getMLDSAPublicKeyLength (variant: MLDSAVariant): number {
  return getMLDSA(variant).lengths.publicKey ?? 0
}

export function getMLDSAPrivateKeyLength (variant: MLDSAVariant): number {
  return getMLDSA(variant).lengths.secretKey ?? 0
}

export function getMLDSASignatureLength (variant: MLDSAVariant): number {
  return getMLDSA(variant).lengths.signature ?? 0
}

export function generateKey (variant: MLDSAVariant): Uint8ArrayKeyPair {
  const { secretKey, publicKey } = getMLDSA(variant).keygen()

  return {
    privateKey: secretKey,
    publicKey
  }
}

export function hashAndSign (variant: MLDSAVariant, key: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array {
  options?.signal?.throwIfAborted()

  try {
    return getMLDSA(variant).sign(msg instanceof Uint8Array ? msg : msg.subarray(), key)
  } catch (err) {
    throw new SigningError(String(err))
  }
}

export function hashAndVerify (variant: MLDSAVariant, key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean {
  options?.signal?.throwIfAborted()

  try {
    return getMLDSA(variant).verify(sig, msg instanceof Uint8Array ? msg : msg.subarray(), key)
  } catch (err) {
    throw new VerificationError(String(err))
  }
}
