import { allocUnsafe as uint8ArrayAllocUnsafe } from 'uint8arrays/alloc'
import type { Uint8ArrayList } from 'uint8arraylist'

export const uint16BEEncode = (value: number): Uint8Array => {
  const target = uint8ArrayAllocUnsafe(2)
  target[0] = value >> 8
  target[1] = value
  return target
}
uint16BEEncode.bytes = 2

export const uint16BEDecode = (data: Uint8Array | Uint8ArrayList): number => {
  if (data.length < 2) { throw RangeError('Could not decode int16BE') }

  if (data instanceof Uint8Array) {
    let value = 0
    value += data[0] << 8
    value += data[1]
    return value
  }

  return data.getUint16(0)
}
uint16BEDecode.bytes = 2
