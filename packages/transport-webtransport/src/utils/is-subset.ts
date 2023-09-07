import { equals as uint8ArrayEquals } from 'uint8arrays/equals'

/**
 * Determines if `maybeSubset` is a subset of `set`. This means that all byte
 * arrays in `maybeSubset` are present in `set`.
 */
export function isSubset (set: Uint8Array[], maybeSubset: Uint8Array[]): boolean {
  const intersection = maybeSubset.filter(byteArray => {
    return Boolean(set.find((otherByteArray: Uint8Array) => uint8ArrayEquals(byteArray, otherByteArray)))
  })
  return (intersection.length === maybeSubset.length)
}
