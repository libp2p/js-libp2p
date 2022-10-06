import { logger } from '@libp2p/logger'
import { pipe } from 'it-pipe'
import errCode from 'err-code'
import { duplexPair } from 'it-pair/duplex'
import { randomBytes } from '@libp2p/crypto'
import * as Errors from './errors.js'
import { codes } from '../errors.js'
import {
  createBoxStream,
  createUnboxStream,
  decodeV1PSK
} from './crypto.js'
import { handshake } from 'it-handshake'
import { NONCE_LENGTH } from './key-generator.js'
import type { ConnectionProtector, MultiaddrConnection } from '@libp2p/interface-connection'
import map from 'it-map'

const log = logger('libp2p:pnet')

export { generateKey } from './key-generator.js'

export interface ProtectorInit {
  enabled?: boolean
  psk: Uint8Array
}

export class PreSharedKeyConnectionProtector implements ConnectionProtector {
  public tag: string
  private readonly psk: Uint8Array
  private readonly enabled: boolean

  /**
   * Takes a Private Shared Key (psk) and provides a `protect` method
   * for wrapping existing connections in a private encryption stream.
   */
  constructor (init: ProtectorInit) {
    this.enabled = init.enabled !== false

    if (this.enabled) {
      const decodedPSK = decodeV1PSK(init.psk)
      this.psk = decodedPSK.psk
      this.tag = decodedPSK.tag ?? ''
    } else {
      this.psk = new Uint8Array()
      this.tag = ''
    }
  }

  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   */
  async protect (connection: MultiaddrConnection): Promise<MultiaddrConnection> {
    if (!this.enabled) {
      return connection
    }

    if (connection == null) {
      throw errCode(new Error(Errors.NO_HANDSHAKE_CONNECTION), codes.ERR_INVALID_PARAMETERS)
    }

    // Exchange nonces
    log('protecting the connection')
    const localNonce = randomBytes(NONCE_LENGTH)

    const shake = handshake(connection)
    shake.write(localNonce)

    const result = await shake.reader.next(NONCE_LENGTH)

    if (result.value == null) {
      throw errCode(new Error(Errors.STREAM_ENDED), codes.ERR_INVALID_PARAMETERS)
    }

    const remoteNonce = result.value.slice()
    shake.rest()

    // Create the boxing/unboxing pipe
    log('exchanged nonces')
    const [internal, external] = duplexPair<Uint8Array>()
    pipe(
      external,
      // Encrypt all outbound traffic
      createBoxStream(localNonce, this.psk),
      shake.stream,
      (source) => map(source, (buf) => buf.subarray()),
      // Decrypt all inbound traffic
      createUnboxStream(remoteNonce, this.psk),
      external
    ).catch(log.error)

    return {
      ...connection,
      ...internal
    }
  }
}
