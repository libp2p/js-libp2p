import crypto from 'crypto'
import { InvalidParametersError } from '@libp2p/interface'
import type { ECDHKey, ECDHKeyPair } from '../interface.js'

export type Curve = 'P-256' | 'P-384' | 'P-521'

const curves = {
  'P-256': 'prime256v1',
  'P-384': 'secp384r1',
  'P-521': 'secp521r1'
}

const curveTypes = Object.keys(curves)
const names = curveTypes.join(' / ')

/**
 * Generates an ephemeral public key and returns a function that will compute the shared secret key.
 *
 * Focuses only on ECDH now, but can be made more general in the future.
 */
export async function generateEphemeralKeyPair (curve: Curve): Promise<ECDHKey> {
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new InvalidParametersError(`Unknown curve: ${curve}. Must be ${names}`)
  }

  const ecdh = crypto.createECDH(curves[curve])
  ecdh.generateKeys()

  return {
    key: ecdh.getPublicKey() as Uint8Array,

    async genSharedKey (theirPub: Uint8Array, forcePrivate?: ECDHKeyPair): Promise<Uint8Array> {
      if (forcePrivate != null) {
        ecdh.setPrivateKey(forcePrivate.private)
      }

      return ecdh.computeSecret(theirPub)
    }
  }
}
