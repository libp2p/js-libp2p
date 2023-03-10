import { CodeError } from '@libp2p/interfaces/errors'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Libp2pRecord } from './index.js'
import type { Validators } from '@libp2p/interface-dht'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'

/**
 * Checks a record and ensures it is still valid.
 * It runs the needed validators.
 * If verification fails the returned Promise will reject with the error.
 */
export async function verifyRecord (validators: Validators, record: Libp2pRecord): Promise<void> {
  const key = record.key
  const keyString = uint8ArrayToString(key)
  const parts = keyString.split('/')

  if (parts.length < 3) {
    // No validator available
    return
  }

  const validator = validators[parts[1].toString()]

  if (validator == null) {
    const errMsg = 'Invalid record keytype'

    throw new CodeError(errMsg, 'ERR_INVALID_RECORD_KEY_TYPE')
  }

  await validator(key, record.value)
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
const validatePublicKeyRecord = async (key: Uint8Array, publicKey: Uint8Array): Promise<void> => {
  if (!(key instanceof Uint8Array)) {
    throw new CodeError('"key" must be a Uint8Array', 'ERR_INVALID_RECORD_KEY_NOT_BUFFER')
  }

  if (key.byteLength < 5) {
    throw new CodeError('invalid public key record', 'ERR_INVALID_RECORD_KEY_TOO_SHORT')
  }

  const prefix = uint8ArrayToString(key.subarray(0, 4))

  if (prefix !== '/pk/') {
    throw new CodeError('key was not prefixed with /pk/', 'ERR_INVALID_RECORD_KEY_BAD_PREFIX')
  }

  const keyhash = key.slice(4)

  const publicKeyHash = await sha256.digest(publicKey)

  if (!uint8ArrayEquals(keyhash, publicKeyHash.bytes)) {
    throw new CodeError('public key does not match passed in key', 'ERR_INVALID_RECORD_HASH_MISMATCH')
  }
}

export const validators: Validators = {
  pk: validatePublicKeyRecord
}
