import type { AbortOptions, StreamMuxerFactory, PeerId, MessageStream } from './index.js'

/**
 * If the remote PeerId is known and passed as an option, the securing operation
 * will throw if the remote peer cannot prove it has the private key that
 * corresponds to the public key the remote PeerId is derived from.
 */
export interface SecureConnectionOptions extends AbortOptions {
  /**
   * This will be set if the remote peer is known in advance
   */
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
  secureOutbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection<Extension>>

  /**
   * Decrypt incoming data. If the remote PeerId is known,
   * pass it for extra verification, otherwise it will be determined during
   * the handshake
   */
  secureInbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection<Extension>>
}

export interface SecuredConnection<Extension = unknown> {
  /**
   * The decrypted data stream
   */
  connection: MessageStream

  /**
   * Any extension data transferred as part of the encryption handshake
   */
  remoteExtensions?: Extension

  /**
   * The identifier of the remote peer
   */
  remotePeer: PeerId

  /**
   * Some encryption protocols allow negotiating application protocols as part
   * of the initial handshake. Where we are able to negotiated a stream muxer
   * for the connection it will be returned here.
   */
  streamMuxer?: StreamMuxerFactory
}
