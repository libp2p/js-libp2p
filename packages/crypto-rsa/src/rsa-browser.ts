import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { jwk2pub, jwk2priv } from './jwk2pem.js'
import type { Uint8ArrayList } from 'uint8arraylist'

/*

RSA encryption/decryption for the browser with webcrypto workaround
"bloody dark magic. webcrypto's why."

Explanation:
  - Convert JWK to nodeForge
  - Convert msg Uint8Array to nodeForge buffer: ByteBuffer is a "binary-string backed buffer", so let's make our Uint8Array a binary string
  - Convert resulting nodeForge buffer to Uint8Array: it returns a binary string, turn that into a Uint8Array

*/

function convertKey (key: JsonWebKey, pub: boolean, msg: Uint8Array | Uint8ArrayList, handle: (msg: string, key: { encrypt(msg: string): string, decrypt(msg: string): string }) => string): Uint8Array {
  const fkey = pub ? jwk2pub(key) : jwk2priv(key)
  const fmsg = uint8ArrayToString(msg instanceof Uint8Array ? msg : msg.subarray(), 'ascii')
  const fomsg = handle(fmsg, fkey)
  return uint8ArrayFromString(fomsg, 'ascii')
}

export function encrypt (key: JsonWebKey, msg: Uint8Array | Uint8ArrayList): Uint8Array {
  return convertKey(key, true, msg, (msg, key) => key.encrypt(msg))
}

export function decrypt (key: JsonWebKey, msg: Uint8Array | Uint8ArrayList): Uint8Array {
  return convertKey(key, false, msg, (msg, key) => key.decrypt(msg))
}
