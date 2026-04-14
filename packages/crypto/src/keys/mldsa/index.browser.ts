import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js' // eslint-disable-line camelcase
import { randomBytes as pqRandomBytes } from '@noble/post-quantum/utils.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { SigningError, VerificationError } from '../../errors.js'
import webcrypto from '../../webcrypto/index.js'
import type { Uint8ArrayKeyPair } from '../interface.js'
import type { MLDSAVariant, AbortOptions } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

type WebCryptoAlgorithm = 'ML-DSA-44' | 'ML-DSA-65' | 'ML-DSA-87'
export type MLDSABackend = 'auto' | 'noble' | 'node-subtle'

const variants = {
  MLDSA44: ml_dsa44, // eslint-disable-line camelcase
  MLDSA65: ml_dsa65, // eslint-disable-line camelcase
  MLDSA87: ml_dsa87 // eslint-disable-line camelcase
} as const

let backendPreference: MLDSABackend = 'auto'
const webCryptoSupport = new Map<MLDSAVariant, Promise<boolean>>()

export const mldsaVariants = Object.keys(variants) as MLDSAVariant[]
export const defaultMLDSAVariant: MLDSAVariant = 'MLDSA65'

export function setMLDSABackend (backend: MLDSABackend): void {
  if (backend !== 'auto' && backend !== 'noble' && backend !== 'node-subtle') {
    throw new Error(`Unsupported ML-DSA backend "${backend}"`)
  }

  backendPreference = backend
}

export function getMLDSABackend (): MLDSABackend {
  return backendPreference
}

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
  return getMLDSASeedLength(variant)
}

export function getMLDSASeedLength (variant: MLDSAVariant): number {
  return getMLDSA(variant).lengths.seed ?? 0
}

export function getMLDSASignatureLength (variant: MLDSAVariant): number {
  return getMLDSA(variant).lengths.signature ?? 0
}

export function generateKey (variant: MLDSAVariant): Uint8ArrayKeyPair {
  const seed = pqRandomBytes(getMLDSASeedLength(variant))
  const { publicKey } = getMLDSA(variant).keygen(seed)

  return {
    privateKey: seed,
    publicKey
  }
}

export function getPublicKeyFromPrivateKey (variant: MLDSAVariant, key: Uint8Array): Uint8Array {
  return getMLDSA(variant).keygen(key).publicKey
}

export function hashAndSign (variant: MLDSAVariant, key: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions, publicKey?: Uint8Array): Uint8Array | Promise<Uint8Array> {
  options?.signal?.throwIfAborted()

  const data = msg instanceof Uint8Array ? msg : msg.subarray()

  if (shouldUseWebCryptoMLDSA()) {
    return hashAndSignWebCrypto(variant, key, publicKey, data)
      .catch(() => {
        const normalizedKey = getMLDSA(variant).keygen(key).secretKey
        return getMLDSA(variant).sign(data, normalizedKey)
      })
  }

  try {
    const normalizedKey = getMLDSA(variant).keygen(key).secretKey

    return getMLDSA(variant).sign(data, normalizedKey)
  } catch (err) {
    throw new SigningError(String(err))
  }
}

export function hashAndVerify (variant: MLDSAVariant, key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean | Promise<boolean> {
  options?.signal?.throwIfAborted()

  const data = msg instanceof Uint8Array ? msg : msg.subarray()

  if (shouldUseWebCryptoMLDSA()) {
    return hashAndVerifyWebCrypto(variant, key, sig, data)
      .catch(() => getMLDSA(variant).verify(sig, data, key))
  }

  try {
    return getMLDSA(variant).verify(sig, data, key)
  } catch (err) {
    throw new VerificationError(String(err))
  }
}

function shouldUseWebCryptoMLDSA (): boolean {
  return backendPreference !== 'noble'
}

async function hashAndSignWebCrypto (variant: MLDSAVariant, seed: Uint8Array, publicKey: Uint8Array | undefined, msg: Uint8Array): Promise<Uint8Array> {
  const supported = await isWebCryptoMLDSASupported(variant)

  if (!supported) {
    throw new SigningError('webcrypto ML-DSA variant not supported')
  }

  const pk = publicKey ?? getMLDSA(variant).keygen(seed).publicKey
  const subtle = webcrypto.get().subtle
  const key = await subtle.importKey('jwk', {
    kty: 'AKP',
    alg: toWebCryptoAlgorithm(variant),
    priv: uint8ArrayToString(seed, 'base64url'),
    pub: uint8ArrayToString(pk, 'base64url'),
    ext: false,
    key_ops: ['sign']
  } as any, {
    name: toWebCryptoAlgorithm(variant)
  }, false, ['sign'])

  const sig = await subtle.sign({ name: toWebCryptoAlgorithm(variant) }, key, msg)
  return new Uint8Array(sig, 0, sig.byteLength)
}

async function hashAndVerifyWebCrypto (variant: MLDSAVariant, publicKey: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean> {
  const supported = await isWebCryptoMLDSASupported(variant)

  if (!supported) {
    throw new VerificationError('webcrypto ML-DSA variant not supported')
  }

  const subtle = webcrypto.get().subtle
  const key = await subtle.importKey('jwk', {
    kty: 'AKP',
    alg: toWebCryptoAlgorithm(variant),
    pub: uint8ArrayToString(publicKey, 'base64url'),
    ext: false,
    key_ops: ['verify']
  } as any, {
    name: toWebCryptoAlgorithm(variant)
  }, false, ['verify'])

  return subtle.verify({ name: toWebCryptoAlgorithm(variant) }, key, sig, msg)
}

async function isWebCryptoMLDSASupported (variant: MLDSAVariant): Promise<boolean> {
  let supportPromise = webCryptoSupport.get(variant)

  if (supportPromise == null) {
    supportPromise = (async () => {
      try {
        const subtle = webcrypto.get().subtle
        const keyPair = await subtle.generateKey({
          name: toWebCryptoAlgorithm(variant)
        }, false, ['sign', 'verify']) as CryptoKeyPair

        return keyPair.privateKey != null && keyPair.publicKey != null
      } catch {
        return false
      }
    })()

    webCryptoSupport.set(variant, supportPromise)
  }

  return supportPromise
}

function toWebCryptoAlgorithm (variant: MLDSAVariant): WebCryptoAlgorithm {
  switch (variant) {
    case 'MLDSA44':
      return 'ML-DSA-44'
    case 'MLDSA65':
      return 'ML-DSA-65'
    case 'MLDSA87':
      return 'ML-DSA-87'
    default:
      throw new Error('Unsupported ML-DSA variant')
  }
}
