import { generateEphemeralKeyPair } from './ecdh/index.js'

/**
 * Generates an ephemeral public key and returns a function that will compute
 * the shared secret key.
 *
 * Focuses only on ECDH now, but can be made more general in the future.
 */
export default generateEphemeralKeyPair
