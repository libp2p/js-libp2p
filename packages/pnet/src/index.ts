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
import { InvalidParametersError } from '@libp2p/interface'
import { byteStream } from '@libp2p/utils'
import { BoxMessageStream, decodeV1PSK } from './crypto.js'
import { NONCE_LENGTH } from './key-generator.js'
import type { ComponentLogger, ConnectionProtector, MultiaddrConnection, AbortOptions } from '@libp2p/interface'

export { generateKey } from './key-generator.js'

export interface ProtectorInit {
  /**
   * A pre-shared key. This must be the same byte value for all peers in the
   * swarm in order for them to communicate.
   */
  psk: Uint8Array
  /**
   * The initial nonce exchange must complete within this many milliseconds
   *
   * @default 1000
   */
  timeout?: number
}

export interface ProtectorComponents {
  logger: ComponentLogger
}

class PreSharedKeyConnectionProtector implements ConnectionProtector {
  public tag: string
  private readonly psk: Uint8Array
  private readonly timeout: number

  /**
   * Takes a Private Shared Key (psk) and provides a `protect` method
   * for wrapping existing connections in a private encryption stream.
   */
  constructor (init: ProtectorInit) {
    this.timeout = init.timeout ?? 1000

    const decodedPSK = decodeV1PSK(init.psk)
    this.psk = decodedPSK.psk
    this.tag = decodedPSK.tag ?? ''
  }

  readonly [Symbol.toStringTag] = '@libp2p/pnet'

  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   */
  async protect (connection: MultiaddrConnection, options?: AbortOptions): Promise<MultiaddrConnection> {
    if (connection == null) {
      throw new InvalidParametersError('No connection for the handshake provided')
    }

    // Exchange nonces
    const log = connection.log.newScope('pnet')
    log('protecting the connection')
    const localNonce = randomBytes(NONCE_LENGTH)

    if (options == null) {
      options = {
        signal: AbortSignal.timeout(this.timeout)
      }
    }

    const bytes = byteStream(connection)

    const [
      result
    ] = await Promise.all([
      bytes.read({
        bytes: NONCE_LENGTH,
        ...options
      }),
      bytes.write(localNonce, options)
    ])

    const remoteNonce = result.subarray()

    // Create the boxing/unboxing pipe
    log('exchanged nonces')

    return new BoxMessageStream({
      localNonce,
      remoteNonce,
      psk: this.psk,
      maConn: connection,
      log
    })
  }
}

export function preSharedKey (init: ProtectorInit): () => ConnectionProtector {
  return () => new PreSharedKeyConnectionProtector(init)
}
