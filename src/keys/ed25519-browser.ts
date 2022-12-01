import * as ed from '@noble/ed25519'

const PUBLIC_KEY_BYTE_LENGTH = 32
const PRIVATE_KEY_BYTE_LENGTH = 64 // private key is actually 32 bytes but for historical reasons we concat private and public keys
const KEYS_BYTE_LENGTH = 32

export { PUBLIC_KEY_BYTE_LENGTH as publicKeyLength }
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

export async function generateKey () {
  // the actual private key (32 bytes)
  const privateKeyRaw = ed.utils.randomPrivateKey()
  const publicKey = await ed.getPublicKey(privateKeyRaw)

  // concatenated the public key to the private key
  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

/**
 * Generate keypair from a 32 byte uint8array
 */
export async function generateKeyFromSeed (seed: Uint8Array) {
  if (seed.length !== KEYS_BYTE_LENGTH) {
    throw new TypeError('"seed" must be 32 bytes in length.')
  } else if (!(seed instanceof Uint8Array)) {
    throw new TypeError('"seed" must be a node.js Buffer, or Uint8Array.')
  }

  // based on node forges algorithm, the seed is used directly as private key
  const privateKeyRaw = seed
  const publicKey = await ed.getPublicKey(privateKeyRaw)

  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

export async function hashAndSign (privateKey: Uint8Array, msg: Uint8Array) {
  const privateKeyRaw = privateKey.subarray(0, KEYS_BYTE_LENGTH)

  return await ed.sign(msg, privateKeyRaw)
}

export async function hashAndVerify (publicKey: Uint8Array, sig: Uint8Array, msg: Uint8Array) {
  return await ed.verify(sig, msg, publicKey)
}

function concatKeys (privateKeyRaw: Uint8Array, publicKey: Uint8Array) {
  const privateKey = new Uint8Array(PRIVATE_KEY_BYTE_LENGTH)
  for (let i = 0; i < KEYS_BYTE_LENGTH; i++) {
    privateKey[i] = privateKeyRaw[i]
    privateKey[KEYS_BYTE_LENGTH + i] = publicKey[i]
  }
  return privateKey
}
