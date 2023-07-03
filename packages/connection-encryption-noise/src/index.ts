import { Noise } from './noise.js'
import type { NoiseInit } from './noise.js'
import type { NoiseExtensions } from './proto/payload.js'
import type { ConnectionEncrypter } from '@libp2p/interface/connection-encrypter'
export type { ICryptoInterface } from './crypto.js'
export { pureJsCrypto } from './crypto/js.js'

export function noise (init: NoiseInit = {}): () => ConnectionEncrypter<NoiseExtensions> {
  return () => new Noise(init)
}
