import 'node-forge/lib/util.js'
import 'node-forge/lib/jsbn.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'

export function bigIntegerToUintBase64url (num: { abs: () => any }, len?: number): string {
  // Call `.abs()` to convert to unsigned
  let buf = Uint8Array.from(num.abs().toByteArray()) // toByteArray converts to big endian

  // toByteArray() gives us back a signed array, which will include a leading 0
  // byte if the most significant bit of the number is 1:
  // https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-integer
  // Our number will always be positive so we should remove the leading padding.
  buf = buf[0] === 0 ? buf.subarray(1) : buf

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return uint8ArrayToString(buf, 'base64url')
}

// Convert a base64url encoded string to a BigInteger
export function base64urlToBigInteger (str: string): typeof forge.jsbn.BigInteger {
  const buf = base64urlToBuffer(str)
  return new forge.jsbn.BigInteger(uint8ArrayToString(buf, 'base16'), 16)
}

export function base64urlToBuffer (str: string, len?: number): Uint8Array {
  let buf = uint8ArrayFromString(str, 'base64urlpad')

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return buf
}
