import { InvalidParametersError } from '@libp2p/interface'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { MissingSelectorError } from '../errors.js'
import type { Selectors } from '../index.js'

/**
 * Select the best record out of the given records
 */
export function bestRecord (selectors: Selectors, k: Uint8Array, records: Uint8Array[]): number {
  if (records.length === 0) {
    throw new InvalidParametersError('No records given')
  }

  const kStr = uint8ArrayToString(k)
  const parts = kStr.split('/')

  if (parts.length < 3) {
    throw new InvalidParametersError('Record key does not have a selector function')
  }

  const selector = selectors[parts[1].toString()]

  if (selector == null) {
    throw new MissingSelectorError(`No selector function configured for key type "${parts[1]}"`)
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
function publicKey (k: Uint8Array, records: Uint8Array[]): number {
  return 0
}

export const selectors: Selectors = {
  pk: publicKey
}
