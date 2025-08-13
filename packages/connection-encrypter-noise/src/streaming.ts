import { Uint8ArrayList } from 'uint8arraylist'
import { NOISE_MSG_MAX_LENGTH_BYTES, NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG } from './constants.js'
import { uint16BEEncode } from './encoder.js'
import type { MetricsRegistry } from './metrics.js'
import type { HandshakeResult } from './types.js'
import type { Transform } from 'it-stream-types'

const CHACHA_TAG_LENGTH = 16

// Returns generator that encrypts payload from the user
export function encryptStream (handshake: HandshakeResult, metrics?: MetricsRegistry): Transform<AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  return async function * (source) {
    for await (const chunk of source) {
      for (let i = 0; i < chunk.length; i += NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG) {
        let end = i + NOISE_MSG_MAX_LENGTH_BYTES_WITHOUT_TAG
        if (end > chunk.length) {
          end = chunk.length
        }

        let data: Uint8Array | Uint8ArrayList

        if (chunk instanceof Uint8Array) {
          data = handshake.encrypt(chunk.subarray(i, end))
        } else {
          data = handshake.encrypt(chunk.sublist(i, end))
        }

        metrics?.encryptedPackets.increment()

        yield new Uint8ArrayList(uint16BEEncode(data.byteLength), data)
      }
    }
  }
}

// Decrypt received payload to the user
export function decryptStream (handshake: HandshakeResult, metrics?: MetricsRegistry): Transform<AsyncGenerator<Uint8ArrayList>, AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  return async function * (source) {
    for await (const chunk of source) {
      for (let i = 0; i < chunk.length; i += NOISE_MSG_MAX_LENGTH_BYTES) {
        let end = i + NOISE_MSG_MAX_LENGTH_BYTES
        if (end > chunk.length) {
          end = chunk.length
        }

        if (end - CHACHA_TAG_LENGTH < i) {
          throw new Error('Invalid chunk')
        }

        const encrypted = chunk.sublist(i, end)
        // memory allocation is not cheap so reuse the encrypted Uint8Array
        // see https://github.com/ChainSafe/js-libp2p-noise/pull/242#issue-1422126164
        // this is ok because chacha20 reads bytes one by one and don't reread after that
        // it's also tested in https://github.com/ChainSafe/as-chacha20poly1305/pull/1/files#diff-25252846b58979dcaf4e41d47b3eadd7e4f335e7fb98da6c049b1f9cd011f381R48
        const dst = chunk.subarray(i, end - CHACHA_TAG_LENGTH)
        try {
          const plaintext = handshake.decrypt(encrypted, dst)
          metrics?.decryptedPackets.increment()
          yield plaintext
        } catch (e) {
          metrics?.decryptErrors.increment()
          throw e
        }
      }
    }
  }
}
