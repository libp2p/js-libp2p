import { InvalidPrivateKeyError, InvalidPublicKeyError } from '@libp2p/interface'
import type { Crypto } from '@libp2p/interface'

export class InvalidParametersError extends Error {
  static name = 'InvalidParametersError'
  name = 'InvalidParametersError'
}

export class UnknownCryptoError extends Error {
  static name = 'UnknownCryptoError'
  name = 'UnknownCryptoError'
}

/**
 * Runs `fn` and rethrows its errors as `ErrorClass`, except aborts and
 * unsupported key types
 */
export async function rethrowAs<T> (ErrorClass: typeof InvalidPublicKeyError | typeof InvalidPrivateKeyError, fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'UnknownCryptoError' || err?.name === ErrorClass.name) {
      throw err
    }

    throw new ErrorClass(err?.message)
  }
}

/**
 * Makes a crypto's `*FromProtobuf` methods reject malformed keys with
 * `InvalidPublicKeyError`/`InvalidPrivateKeyError`
 */
export function withKeyErrors<T extends Crypto> (crypto: T): T {
  const publicKeyFromProtobuf = crypto.publicKeyFromProtobuf.bind(crypto)
  const privateKeyFromProtobuf = crypto.privateKeyFromProtobuf.bind(crypto)

  crypto.publicKeyFromProtobuf = async (buf, options) => rethrowAs(InvalidPublicKeyError, () => publicKeyFromProtobuf(buf, options))
  crypto.privateKeyFromProtobuf = async (buf, options) => rethrowAs(InvalidPrivateKeyError, () => privateKeyFromProtobuf(buf, options))

  return crypto
}
