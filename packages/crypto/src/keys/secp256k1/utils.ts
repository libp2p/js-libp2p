import { InvalidParametersError, InvalidPrivateKeyError, InvalidPublicKeyError } from '@libp2p/interface'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { exporter } from '../exporter.js'
import { privateKeyToProtobuf } from '../index.js'
import { Secp256k1PublicKey as Secp256k1PublicKeyClass, Secp256k1PrivateKey as Secp256k1PrivateKeyClass } from './secp256k1.js'
import type { ExportFormat } from '../index.js'
import type { Secp256k1PublicKey, Secp256k1PrivateKey } from '@libp2p/interface'
import type { Multibase } from 'multiformats'

const PRIVATE_KEY_BYTE_LENGTH = 32

export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

/**
 * Exports the key into a password protected `format`
 */
export async function exportSecp256k1PrivateKey (key: Secp256k1PrivateKey, password: string, format: ExportFormat = 'libp2p-key'): Promise<Multibase<'m'>> {
  if (format === 'libp2p-key') {
    return exporter(privateKeyToProtobuf(key), password)
  } else {
    throw new InvalidParametersError('Export format is not supported')
  }
}

export function unmarshalSecp256k1PrivateKey (bytes: Uint8Array): Secp256k1PrivateKey {
  return new Secp256k1PrivateKeyClass(bytes)
}

export function unmarshalSecp256k1PublicKey (bytes: Uint8Array): Secp256k1PublicKey {
  return new Secp256k1PublicKeyClass(bytes)
}

export async function generateSecp256k1KeyPair (): Promise<Secp256k1PrivateKey> {
  const privateKeyBytes = generateSecp256k1PrivateKey()
  return new Secp256k1PrivateKeyClass(privateKeyBytes)
}

export function compressSecp256k1PublicKey (key: Uint8Array): Uint8Array {
  const point = secp.ProjectivePoint.fromHex(key).toRawBytes(true)
  return point
}

export function decompressSecp256k1PublicKey (key: Uint8Array): Uint8Array {
  const point = secp.ProjectivePoint.fromHex(key).toRawBytes(false)
  return point
}

export function validateSecp256k1PrivateKey (key: Uint8Array): Uint8Array {
  try {
    secp.getPublicKey(key, true)

    return key
  } catch (err) {
    throw new InvalidPrivateKeyError(String(err))
  }
}

export function validateSecp256k1PublicKey (key: Uint8Array): Uint8Array {
  try {
    secp.ProjectivePoint.fromHex(key)

    return key
  } catch (err) {
    throw new InvalidPublicKeyError(String(err))
  }
}

export function computeSecp256k1PublicKey (privateKey: Uint8Array): Uint8Array {
  try {
    return secp.getPublicKey(privateKey, true)
  } catch (err) {
    throw new InvalidPrivateKeyError(String(err))
  }
}

export function generateSecp256k1PrivateKey (): Uint8Array {
  return secp.utils.randomPrivateKey()
}