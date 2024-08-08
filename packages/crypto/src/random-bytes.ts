import { InvalidParametersError } from '@libp2p/interface'
import { randomBytes as randB } from '@noble/hashes/utils'

/**
 * Generates a Uint8Array with length `number` populated by random bytes
 */
export default function randomBytes (length: number): Uint8Array {
  if (isNaN(length) || length <= 0) {
    throw new InvalidParametersError('random bytes length must be a Number bigger than 0')
  }
  return randB(length)
}
