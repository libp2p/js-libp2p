/**
 * Default options for key derivation
 *
 * @see https://cryptosense.com/parametesr-choice-for-pbkdf2/
 */
export const DEK_INIT = {
  keyLength: 512 / 8,
  iterationCount: 10000,
  salt: 'you should override this value with a crypto secure random number',
  hash: 'sha2-512'
}
