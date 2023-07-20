import { TAG_LENGTH } from '@stablelib/chacha20poly1305'
import { NOISE_MSG_MAX_LENGTH_BYTES, NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG } from '../constants.js'
import { uint16BEEncode } from '../encoder.js'
import type { IHandshake } from '../@types/handshake-interface.js'
import type { MetricsRegistry } from '../metrics.js'
import type { Transform } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

// Returns generator that encrypts payload from the user
export function encryptStream (handshake: IHandshake, metrics?: MetricsRegistry): Transform<AsyncIterable<Uint8Array>> {
  return async function * (source) {
    for await (const chunk of source) {
      for (let i = 0; i < chunk.length; i += NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG) {
        let end = i + NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG
        if (end > chunk.length) {
          end = chunk.length
        }

        const data = handshake.encrypt(chunk.subarray(i, end), handshake.session)
        metrics?.encryptedPackets.increment()

        yield uint16BEEncode(data.byteLength)
        yield data
      }
    }
  }
}

// Decrypt received payload to the user
export function decryptStream (handshake: IHandshake, metrics?: MetricsRegistry): Transform<AsyncIterable<Uint8ArrayList>, AsyncIterable<Uint8Array>> {
  return async function * (source) {
    for await (const chunk of source) {
      for (let i = 0; i < chunk.length; i += NOISE_MSG_MAX_LENGTH_BYTES) {
        let end = i + NOISE_MSG_MAX_LENGTH_BYTES
        if (end > chunk.length) {
          end = chunk.length
        }

        if (end - TAG_LENGTH < i) {
          throw new Error('Invalid chunk')
        }
        const encrypted = chunk.subarray(i, end)
        // memory allocation is not cheap so reuse the encrypted Uint8Array
        // see https://github.com/ChainSafe/js-libp2p-noise/pull/242#issue-1422126164
        // this is ok because chacha20 reads bytes one by one and don't reread after that
        // it's also tested in https://github.com/ChainSafe/as-chacha20poly1305/pull/1/files#diff-25252846b58979dcaf4e41d47b3eadd7e4f335e7fb98da6c049b1f9cd011f381R48
        const dst = chunk.subarray(i, end - TAG_LENGTH)
        const { plaintext: decrypted, valid } = handshake.decrypt(encrypted, handshake.session, dst)
        if (!valid) {
          metrics?.decryptErrors.increment()
          throw new Error('Failed to validate decrypted chunk')
        }
        metrics?.decryptedPackets.increment()
        yield decrypted
      }
    }
  }
}
