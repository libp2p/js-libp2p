import type { MultiaddrConnection } from './connection.js'
import type { AbortOptions, StreamMuxerFactory } from './index.js'
import type { PeerId } from './peer-id.js'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * If the remote PeerId is known and passed as an option, the securing operation
 * will throw if the remote peer cannot prove it has the private key that
 * corresponds to the public key the remote PeerId is derived from.
 */
export interface SecureConnectionOptions extends AbortOptions {
  remotePeer?: PeerId

  /**
   * Some encryption protocols allow negotiating application protocols as part
   * of the initial handshake. The negotiated stream muxer protocol will be
   * included as part of the from the `secureOutbound`/`secureInbound` methods
   * unless `false` is passed here.
   */
  skipStreamMuxerNegotiation?: boolean
}

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
  secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (connection: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream, Extension>>

  /**
   * Decrypt incoming data. If the remote PeerId is known,
   * pass it for extra verification, otherwise it will be determined during
   * the handshake
   */
  secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (connection: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream, Extension>>
}

export interface SecuredConnection<Stream = any, Extension = unknown> {
  conn: Stream
  remoteExtensions?: Extension
  remotePeer: PeerId

  /**
   * Some encryption protocols allow negotiating application protocols as part
   * of the initial handshake. Where we are able to negotiated a stream muxer
   * for the connection it will be returned here.
   */
  streamMuxer?: StreamMuxerFactory
}
