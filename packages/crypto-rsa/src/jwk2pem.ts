import 'node-forge/lib/util.js'
import 'node-forge/lib/rsa.js'
import 'node-forge/lib/jsbn.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

function base64urlToBuffer (str: string, len?: number): Uint8Array {
  let buf = uint8ArrayFromString(str, 'base64urlpad')

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return buf
}

// Convert a base64url encoded string to a BigInteger
function base64urlToBigInteger (str: string): typeof forge.jsbn.BigInteger {
  const buf = base64urlToBuffer(str)
  return new forge.jsbn.BigInteger(uint8ArrayToString(buf, 'base16'), 16)
}

export interface JWK {
  encrypt(msg: string): string
  decrypt(msg: string): string
}

function convert (key: any, types: string[]): Array<typeof forge.jsbn.BigInteger> {
  return types.map(t => base64urlToBigInteger(key[t]))
}

export function jwk2priv (key: JsonWebKey): JWK {
  return forge.pki.setRsaPrivateKey(...convert(key, ['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']))
}

export function jwk2pub (key: JsonWebKey): JWK {
  return forge.pki.setRsaPublicKey(...convert(key, ['n', 'e']))
}
