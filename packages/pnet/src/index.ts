/**
 * @packageDocumentation
 *
 * Connection protection management for libp2p leveraging PSK encryption via XSalsa20.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { preSharedKey, generateKey } from '@libp2p/pnet'
 *
 * // Create a Uint8Array and write the swarm key to it
 * const swarmKey = new Uint8Array(95)
 * generateKey(swarmKey)
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionProtector: preSharedKey({
 *     psk: swarmKey
 *   })
 * })
 * ```
 *
 * ## Private Shared Keys
 *
 * Private Shared Keys are expected to be in the following format:
 *
 * ```
 * /key/swarm/psk/1.0.0/
 * /base16/
 * dffb7e3135399a8b1612b2aaca1c36a3a8ac2cd0cca51ceeb2ced87d308cac6d
 * ```
 *
 * ## PSK Generation
 *
 * A utility method has been created to generate a key for your private network. You can use one of the methods below to generate your key.
 *
 * ### From a module using libp2p
 *
 * If you have a module locally that depends on libp2p, you can run the following from that project, assuming the node_modules are installed.
 *
 * ```console
 * node -e "import('@libp2p/pnet').then(({ generateKey }) => generateKey(process.stdout))" > swarm.key
 * ```
 *
 * ### Programmatically
 *
 * ```TypeScript
 * import fs from 'fs'
 * import { generateKey } from '@libp2p/pnet'
 *
 * const swarmKey = new Uint8Array(95)
 * generateKey(swarmKey)
 *
 * fs.writeFileSync('swarm.key', swarmKey)
 * ```
 */

import { randomBytes } from '@libp2p/crypto'
import { CodeError } from '@libp2p/interface'
import { byteStream } from 'it-byte-stream'
import map from 'it-map'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import {
  createBoxStream,
  createUnboxStream,
  decodeV1PSK
} from './crypto.js'
import * as Errors from './errors.js'
import { NONCE_LENGTH } from './key-generator.js'
import type { ComponentLogger, Logger, ConnectionProtector, MultiaddrConnection } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export { generateKey } from './key-generator.js'

export interface ProtectorInit {
  /**
   * A pre-shared key. This must be the same byte value for all peers in the
   * swarm in order for them to communicate.
   */
  psk: Uint8Array
  /**
   * The initial nonce exchange must complete within this many milliseconds
   * (default: 1000)
   */
  timeout?: number
}

export interface ProtectorComponents {
  logger: ComponentLogger
}

class PreSharedKeyConnectionProtector implements ConnectionProtector {
  public tag: string
  private readonly log: Logger
  private readonly psk: Uint8Array
  private readonly timeout: number

  /**
   * Takes a Private Shared Key (psk) and provides a `protect` method
   * for wrapping existing connections in a private encryption stream.
   */
  constructor (components: ProtectorComponents, init: ProtectorInit) {
    this.log = components.logger.forComponent('libp2p:pnet')
    this.timeout = init.timeout ?? 1000

    const decodedPSK = decodeV1PSK(init.psk)
    this.psk = decodedPSK.psk
    this.tag = decodedPSK.tag ?? ''
  }

  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   */
  async protect (connection: MultiaddrConnection): Promise<MultiaddrConnection> {
    if (connection == null) {
      throw new CodeError(Errors.NO_HANDSHAKE_CONNECTION, Errors.ERR_INVALID_PARAMETERS)
    }

    // Exchange nonces
    this.log('protecting the connection')
    const localNonce = randomBytes(NONCE_LENGTH)

    const signal = AbortSignal.timeout(this.timeout)

    const bytes = byteStream(connection)

    const [
      , result
    ] = await Promise.all([
      bytes.write(localNonce, {
        signal
      }),
      bytes.read(NONCE_LENGTH, {
        signal
      })
    ])

    const remoteNonce = result.subarray()

    // Create the boxing/unboxing pipe
    this.log('exchanged nonces')
    const [internal, external] = duplexPair<Uint8Array | Uint8ArrayList>()
    pipe(
      external,
      // Encrypt all outbound traffic
      createBoxStream(localNonce, this.psk),
      bytes.unwrap(),
      (source) => map(source, (buf) => buf.subarray()),
      // Decrypt all inbound traffic
      createUnboxStream(remoteNonce, this.psk),
      external
    ).catch(this.log.error)

    return {
      ...connection,
      ...internal
    }
  }
}

export function preSharedKey (init: ProtectorInit): (components: ProtectorComponents) => ConnectionProtector {
  return (components) => new PreSharedKeyConnectionProtector(components, init)
}
