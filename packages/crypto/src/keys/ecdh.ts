import crypto from 'crypto'
import { CodeError } from '@libp2p/interfaces/errors'
import type { ECDHKey, ECDHKeyPair } from './interface.js'

const curves = {
  'P-256': 'prime256v1',
  'P-384': 'secp384r1',
  'P-521': 'secp521r1'
}

const curveTypes = Object.keys(curves)
const names = curveTypes.join(' / ')

export async function generateEphmeralKeyPair (curve: string): Promise<ECDHKey> { // eslint-disable-line require-await
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new CodeError(`Unknown curve: ${curve}. Must be ${names}`, 'ERR_INVALID_CURVE')
  }

  const ecdh = crypto.createECDH(curves[curve])
  ecdh.generateKeys()

  return {
    key: ecdh.getPublicKey() as Uint8Array,

    async genSharedKey (theirPub: Uint8Array, forcePrivate?: ECDHKeyPair): Promise<Uint8Array> { // eslint-disable-line require-await
      if (forcePrivate != null) {
        ecdh.setPrivateKey(forcePrivate.private)
      }

      return ecdh.computeSecret(theirPub)
    }
  }
}
