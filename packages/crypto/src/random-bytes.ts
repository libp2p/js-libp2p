import { InvalidParametersError } from '@libp2p/interface'

/**
 * Generates a Uint8Array with length `number` populated by random bytes
 *
 * @deprecated use `crypto.getRandomValues()` instead
 */
export default function randomBytes (length: number): Uint8Array {
  if (isNaN(length) || length <= 0) {
    throw new InvalidParametersError('random bytes length must be a Number bigger than 0')
  }
  return crypto.getRandomValues(new Uint8Array(length))
}
