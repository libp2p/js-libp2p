import { CodeError } from '@libp2p/interface/errors'
import { randomBytes as randB } from '@noble/hashes/utils'

export default function randomBytes (length: number): Uint8Array {
  if (isNaN(length) || length <= 0) {
    throw new CodeError('random bytes length must be a Number bigger than 0', 'ERR_INVALID_LENGTH')
  }
  return randB(length)
}
