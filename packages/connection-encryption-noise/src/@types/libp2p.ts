import type { bytes32 } from './basic.js'
import type { NoiseExtensions } from '../proto/payload.js'
import type { ConnectionEncrypter } from '@libp2p/interface/connection-encrypter'

export interface KeyPair {
  publicKey: bytes32
  privateKey: bytes32
}

export interface INoiseConnection extends ConnectionEncrypter<NoiseExtensions> {}
