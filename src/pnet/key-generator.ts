import { randomBytes } from '@libp2p/crypto'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

/**
 * Generates a PSK that can be used in a libp2p-pnet private network
 *
 * @param {Uint8Array | NodeJS.WriteStream} bytes - An object to write the psk into
 * @returns {void}
 */
export function generateKey (bytes: Uint8Array | NodeJS.WriteStream) {
  const psk = uint8ArrayToString(randomBytes(KEY_LENGTH), 'base16')
  const key = uint8ArrayFromString('/key/swarm/psk/1.0.0/\n/base16/\n' + psk)

  if (bytes instanceof Uint8Array) {
    bytes.set(key)
  } else {
    bytes.write(key)
  }
}

export const NONCE_LENGTH = 24
export const KEY_LENGTH = 32
