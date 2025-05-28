import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidParametersError } from '@libp2p/interface'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Validators } from '../index.js'
import type { Libp2pRecord } from '@libp2p/record'
import type { AbortOptions } from 'it-pushable'

/**
 * Checks a record and ensures it is still valid.
 * It runs the needed validators.
 * If verification fails the returned Promise will reject with the error.
 */
export async function verifyRecord (validators: Validators, record: Libp2pRecord, options?: AbortOptions): Promise<void> {
  const key = record.key
  const keyString = uint8ArrayToString(key)
  const parts = keyString.split('/')

  if (parts.length < 3) {
    // No validator available
    return
  }

  const validator = validators[parts[1].toString()]

  if (validator == null) {
    throw new InvalidParametersError(`No validator available for key type "${parts[1]}"`)
  }

  await validator(key, record.value, options)
}

/**
 * Validator for public key records.
 * Verifies that the passed in record value is the PublicKey
 * that matches the passed in key.
 * If validation fails the returned Promise will reject with the error.
 *
 * @param {Uint8Array} key - A valid key is of the form `'/pk/<keymultihash>'`
 * @param {Uint8Array} publicKey - The public key to validate against (protobuf encoded).
 */
const validatePublicKeyRecord = async (key: Uint8Array, publicKey: Uint8Array, options?: AbortOptions): Promise<void> => {
  if (!(key instanceof Uint8Array)) {
    throw new InvalidParametersError('"key" must be a Uint8Array')
  }

  if (key.byteLength < 5) {
    throw new InvalidParametersError('Invalid public key record')
  }

  const prefix = uint8ArrayToString(key.subarray(0, 4))

  if (prefix !== '/pk/') {
    throw new InvalidParametersError('key was not prefixed with /pk/')
  }

  const pubKey = publicKeyFromProtobuf(publicKey)
  const keyHash = key.slice(4)

  if (!uint8ArrayEquals(keyHash, pubKey.toMultihash().bytes)) {
    throw new InvalidParametersError('public key does not match passed in key')
  }
}

export const validators: Validators = {
  pk: validatePublicKeyRecord
}
