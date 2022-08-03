import { utils } from '@noble/secp256k1'
import errcode from 'err-code'

export default function randomBytes (length: number): Uint8Array {
  if (isNaN(length) || length <= 0) {
    throw errcode(new Error('random bytes length must be a Number bigger than 0'), 'ERR_INVALID_LENGTH')
  }
  return utils.randomBytes(length)
}
