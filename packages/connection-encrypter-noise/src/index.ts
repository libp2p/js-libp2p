/**
 * @packageDocumentation
 *
 * This repository contains TypeScript implementation of noise protocol, an encryption protocol used in libp2p.
 *
 * ## Usage
 *
 * Install with `yarn add @chainsafe/libp2p-noise` or `npm i @chainsafe/libp2p-noise`.
 *
 * Example of using default noise configuration and passing it to the libp2p config:
 *
 * ```ts
 * import {createLibp2p} from "libp2p"
 * import {noise} from "@chainsafe/libp2p-noise"
 *
 * //custom noise configuration, pass it instead of `noise()`
 * //x25519 private key
 * const n = noise({ staticNoiseKey });
 *
 * const libp2p = await createLibp2p({
 *   connectionEncrypters: [noise()],
 *   //... other options
 * })
 * ```
 *
 * See the [NoiseInit](https://github.com/ChainSafe/js-libp2p-noise/blob/master/src/noise.ts#L22-L30) interface for noise configuration options.
 *
 * ## API
 *
 * This module exposes an implementation of the [ConnectionEncrypter](https://libp2p.github.io/js-libp2p/interfaces/_libp2p_interface.ConnectionEncrypter.html) interface.
 *
 * ## Bring your own crypto
 *
 * You can provide a custom crypto implementation (instead of the default, based on [@noble](https://paulmillr.com/noble/)) by adding a `crypto` field to the init argument passed to the `Noise` factory.
 *
 * The implementation must conform to the `ICryptoInterface`, defined in <https://github.com/ChainSafe/js-libp2p-noise/blob/master/src/crypto.ts>
 */

import { Noise } from './noise.js'
import type { NoiseInit, NoiseExtensions } from './noise.js'
import type { KeyPair } from './types.js'
import type { ComponentLogger, ConnectionEncrypter, Metrics, PeerId, PrivateKey, Upgrader } from '@libp2p/interface'

export { pureJsCrypto } from './crypto/js.js'
export type { ICryptoInterface } from './crypto.js'
export type { NoiseInit, NoiseExtensions, KeyPair }

export interface NoiseComponents {
  peerId: PeerId
  privateKey: PrivateKey
  logger: ComponentLogger
  upgrader: Upgrader
  metrics?: Metrics
}

export function noise (init: NoiseInit = {}): (components: NoiseComponents) => ConnectionEncrypter<NoiseExtensions> {
  return (components: NoiseComponents) => new Noise(components, init)
}
