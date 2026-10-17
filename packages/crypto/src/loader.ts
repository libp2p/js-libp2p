import { ecdsaCrypto } from './ecdsa.ts'
import { ed25519Crypto } from './ed25519.ts'
import { UnknownCryptoError } from './errors.ts'
import { rsaCrypto } from './rsa.ts'
import type { Crypto, CryptoLoader } from '@libp2p/interface'

/**
 * Creates a loader for the default cryptos (Ed25519, RSA, ECDSA) plus the
 * passed ones, which are registered by type and code and replace a default
 * with the same type
 */
export function createCryptoLoader (cryptos: Crypto[] = []): CryptoLoader {
  const registry = new Map<string | number, Crypto>()

  for (const crypto of [ed25519Crypto(), rsaCrypto(), ecdsaCrypto(), ...cryptos]) {
    registry.set(crypto.type, crypto)
    registry.set(crypto.code, crypto)
  }

  return async (typeOrCode, options) => {
    options?.signal?.throwIfAborted()

    const crypto = registry.get(typeOrCode)

    if (crypto == null) {
      throw new UnknownCryptoError(`No crypto is configured for key type ${typeOrCode}`)
    }

    return crypto
  }
}

let defaultLoader: CryptoLoader | undefined

export function defaultCryptoLoader (): CryptoLoader {
  defaultLoader ??= createCryptoLoader()

  return defaultLoader
}
