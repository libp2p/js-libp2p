import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

export function base64urlToBuffer (str: string, len?: number): Uint8Array {
  let buf = uint8ArrayFromString(str, 'base64urlpad')

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return buf
}

export function isPromise <T = unknown> (thing: any): thing is Promise<T> {
  if (thing == null) {
    return false
  }

  return typeof thing.then === 'function' &&
    typeof thing.catch === 'function' &&
    typeof thing.finally === 'function'
}
