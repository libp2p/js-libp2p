// @ts-expect-error types are missing
import forgePbkdf2 from 'node-forge/lib/pbkdf2.js'
// @ts-expect-error types are missing
import forgeUtil from 'node-forge/lib/util.js'
import errcode from 'err-code'

/**
 * Maps an IPFS hash name to its node-forge equivalent.
 *
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 *
 * @private
 */
const hashName = {
  sha1: 'sha1',
  'sha2-256': 'sha256',
  'sha2-512': 'sha512'
}

/**
 * Computes the Password-Based Key Derivation Function 2.
 */
export default function pbkdf2 (password: string, salt: string, iterations: number, keySize: number, hash: string): string {
  if (hash !== 'sha1' && hash !== 'sha2-256' && hash !== 'sha2-512') {
    const types = Object.keys(hashName).join(' / ')
    throw errcode(new Error(`Hash '${hash}' is unknown or not supported. Must be ${types}`), 'ERR_UNSUPPORTED_HASH_TYPE')
  }

  const hasher = hashName[hash]
  const dek = forgePbkdf2(
    password,
    salt,
    iterations,
    keySize,
    hasher
  )

  return forgeUtil.encode64(dek, null)
}
