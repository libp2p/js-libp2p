import Sinon from 'sinon'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import type { SinonMatcher } from 'sinon'
import type { Uint8ArrayList } from 'uint8arraylist'

export function matchBytes (bytes: Uint8Array | Uint8ArrayList): SinonMatcher {
  return Sinon.match((val: Uint8Array | Uint8ArrayList) => {
    return uint8ArrayEquals(val.subarray(), bytes.subarray())
  })
}
