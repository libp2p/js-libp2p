import type { MultiaddrConnection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * A libp2p connection encrypter module must be compliant to this interface
 * to ensure all exchanged data between two peers is encrypted.
 */
export interface ConnectionEncrypter<Extension = unknown> {
  protocol: string

  /**
   * Encrypt outgoing data to the remote party. If the remote PeerId is known,
   * pass it for extra verification, otherwise it will be determined during
   * the handshake.
   */
  secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localPeer: PeerId, connection: Stream, remotePeer?: PeerId): Promise<SecuredConnection<Stream, Extension>>

  /**
   * Decrypt incoming data. If the remote PeerId is known,
   * pass it for extra verification, otherwise it will be determined during
   * the handshake
   */
  secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localPeer: PeerId, connection: Stream, remotePeer?: PeerId): Promise<SecuredConnection<Stream, Extension>>
}

export interface SecuredConnection<Stream = any, Extension = unknown> {
  conn: Stream
  remoteExtensions?: Extension
  remotePeer: PeerId
}
