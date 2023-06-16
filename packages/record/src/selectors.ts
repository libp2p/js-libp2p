import { CodeError } from '@libp2p/interfaces/errors'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Selectors } from '@libp2p/interface-dht'

/**
 * Select the best record out of the given records
 */
export function bestRecord (selectors: Selectors, k: Uint8Array, records: Uint8Array[]): number {
  if (records.length === 0) {
    const errMsg = 'No records given'

    throw new CodeError(errMsg, 'ERR_NO_RECORDS_RECEIVED')
  }

  const kStr = uint8ArrayToString(k)
  const parts = kStr.split('/')

  if (parts.length < 3) {
    const errMsg = 'Record key does not have a selector function'

    throw new CodeError(errMsg, 'ERR_NO_SELECTOR_FUNCTION_FOR_RECORD_KEY')
  }

  const selector = selectors[parts[1].toString()]

  if (selector == null) {
    const errMsg = `Unrecognized key prefix: ${parts[1]}`

    throw new CodeError(errMsg, 'ERR_UNRECOGNIZED_KEY_PREFIX')
  }

  if (records.length === 1) {
    return 0
  }

  return selector(k, records)
}

/**
 * Best record selector, for public key records.
 * Simply returns the first record, as all valid public key
 * records are equal
 */
function publickKey (k: Uint8Array, records: Uint8Array[]): number {
  return 0
}

export const selectors: Selectors = {
  pk: publickKey
}
