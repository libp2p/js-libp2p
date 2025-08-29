/**
 * @packageDocumentation
 *
 * This repository holds interop tests for testing compatibility between different libp2p implementations.
 *
 * @example How to run the tests
 *
 * Create a js file that configures the different types of daemon:
 *
 * ```js
 * import { interopTests } from '@libp2p/interop'
 * import type { Daemon, DaemonFactory } from '@libp2p/interop'
 *
 * async function createGoPeer (options: SpawnOptions): Promise<Daemon> {
 *   // your implementation here
 * }
 *
 * async function createJsPeer (options: SpawnOptions): Promise<Daemon> {
 *   // your implementation here
 * }
 *
 * async function main () {
 *   const factory: DaemonFactory = {
 *     async spawn (options: SpawnOptions) {
 *       if (options.type === 'go') {
 *         return createGoPeer(options)
 *       }
 *
 *       return createJsPeer(options)
 *     }
 *   }
 *
 *   interopTests(factory)
 * }
 *
 * main().catch(err => {
 *   console.error(err)
 *   process.exit(1)
 * })
 * ```
 *
 * For an example, see the js-libp2p interop test runner.
 */

import { connectTests } from './connect/index.js'
import { dhtTests } from './dht/index.js'
import { pubsubTests } from './pubsub/index.js'
import { relayTests } from './relay/index.js'
import { streamTests } from './streams/index.js'
import type { DaemonClient } from '@libp2p/daemon-client'

export interface Daemon {
  stop(): Promise<void>
  client: DaemonClient
}

export type NodeType = 'js' | 'go'
export type PeerIdType = 'rsa' | 'ed25519' | 'secp256k1'
export type PubSubRouter = 'gossipsub' | 'floodsub'
export type Muxer = 'mplex' | 'yamux'
export type Encryption = 'noise' | 'tls' | 'plaintext'
export type TransportType = 'tcp' | 'webtransport' | 'webrtc-direct'

export interface SpawnOptions {
  type: NodeType
  key?: string
  encryption?: Encryption
  dht?: boolean
  pubsub?: boolean
  pubsubRouter?: PubSubRouter
  muxer?: Muxer
  relay?: boolean
  // the node will not listen on any
  // addresses if true
  noListen?: boolean
  transport?: TransportType
}

export interface DaemonFactory {
  spawn(options: SpawnOptions): Promise<Daemon>
}

export async function interopTests (factory: DaemonFactory): Promise<void> {
  connectTests(factory)
  relayTests(factory)
  await dhtTests(factory)
  await pubsubTests(factory)
  await streamTests(factory)
}

export {
  connectTests as connectInteropTests,
  dhtTests as dhtInteropTests,
  pubsubTests as pubsubInteropTests,
  streamTests as streamInteropTests,
  relayTests as relayInteropTests
}

/**
 * Some tests allow skipping certain configurations. When this is necessary,
 * `DaemonFactory.spawn` should thow an instance of this error.
 */
export class UnsupportedError extends Error {
  constructor (message = 'Unsupported test configuration') {
    super(message)

    this.name = 'UnsupportedError'
  }
}
