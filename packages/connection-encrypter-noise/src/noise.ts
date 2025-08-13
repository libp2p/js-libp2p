import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidCryptoExchangeError, serviceCapabilities } from '@libp2p/interface'
import { peerIdFromPublicKey } from '@libp2p/peer-id'
import { lpStream } from '@libp2p/utils'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import { NOISE_MSG_MAX_LENGTH_BYTES } from './constants.js'
import { defaultCrypto } from './crypto/index.js'
import { wrapCrypto } from './crypto.js'
import { uint16BEDecode, uint16BEEncode } from './encoder.js'
import { registerMetrics } from './metrics.js'
import { performHandshakeInitiator, performHandshakeResponder } from './performHandshake.js'
import type { ICryptoInterface } from './crypto.js'
import type { NoiseComponents } from './index.js'
import type { MetricsRegistry } from './metrics.js'
import type { HandshakeResult, ICrypto, INoiseConnection, INoiseExtensions, KeyPair } from './types.js'
import type { MultiaddrConnection, SecuredConnection, PrivateKey, PublicKey, StreamMuxerFactory, SecureConnectionOptions, Logger, MessageStream } from '@libp2p/interface'
import type { LengthPrefixedStream } from '@libp2p/utils'
import { toMessageStream } from './utils.ts'

export interface NoiseExtensions {
  webtransportCerthashes: Uint8Array[]
}

export interface NoiseInit {
  /**
   * x25519 private key, reuse for faster handshakes
   */
  staticNoiseKey?: Uint8Array
  extensions?: Partial<NoiseExtensions>
  crypto?: ICryptoInterface
  prologueBytes?: Uint8Array
}

export class Noise implements INoiseConnection {
  public protocol = '/noise'
  public crypto: ICrypto

  private readonly prologue: Uint8Array
  private readonly staticKey: KeyPair
  private readonly extensions?: NoiseExtensions
  private readonly metrics?: MetricsRegistry
  private readonly components: NoiseComponents
  private readonly log: Logger

  constructor (components: NoiseComponents, init: NoiseInit = {}) {
    const { staticNoiseKey, extensions, crypto, prologueBytes } = init
    const { metrics } = components

    this.components = components
    this.log = components.logger.forComponent('libp2p:noise')
    const _crypto = crypto ?? defaultCrypto
    this.crypto = wrapCrypto(_crypto)
    this.extensions = {
      webtransportCerthashes: [],
      ...extensions
    }
    this.metrics = metrics ? registerMetrics(metrics) : undefined

    if (staticNoiseKey) {
      // accepts x25519 private key of length 32
      this.staticKey = _crypto.generateX25519KeyPairFromSeed(staticNoiseKey)
    } else {
      this.staticKey = _crypto.generateX25519KeyPair()
    }
    this.prologue = prologueBytes ?? uint8ArrayAlloc(0)
  }

  readonly [Symbol.toStringTag] = '@chainsafe/libp2p-noise'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption',
    '@chainsafe/libp2p-noise'
  ]

  /**
   * Encrypt outgoing data to the remote party (handshake as initiator)
   *
   * @param connection - streaming iterable duplex that will be encrypted
   * @param options
   * @param options.remotePeer - PeerId of the remote peer. Used to validate the integrity of the remote peer
   * @param options.signal - Used to abort the operation
   */
  async secureOutbound <Stream extends MessageStream = MultiaddrConnection> (connection: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<INoiseExtensions>> {
    const log = connection.log?.newScope('noise') ?? this.log
    const wrappedConnection = lpStream(connection, {
      lengthEncoder: uint16BEEncode,
      lengthDecoder: uint16BEDecode,
      maxDataLength: NOISE_MSG_MAX_LENGTH_BYTES
    })

    const handshake = await this.performHandshakeInitiator(
      wrappedConnection,
      this.components.privateKey,
      log,
      options?.remotePeer?.publicKey,
      options
    )
    const publicKey = publicKeyFromProtobuf(handshake.payload.identityKey)

    return {
      connection: toMessageStream(wrappedConnection.unwrap(), handshake, this.metrics),
      remoteExtensions: handshake.payload.extensions,
      remotePeer: peerIdFromPublicKey(publicKey),
      streamMuxer: options?.skipStreamMuxerNegotiation === true ? undefined : this.getStreamMuxer(handshake.payload.extensions?.streamMuxers)
    }
  }

  private getStreamMuxer (protocols?: string[]): StreamMuxerFactory | undefined {
    if (protocols == null || protocols.length === 0) {
      return
    }

    const streamMuxers = this.components.upgrader.getStreamMuxers()

    if (streamMuxers != null) {
      for (const protocol of protocols) {
        const streamMuxer = streamMuxers.get(protocol)

        if (streamMuxer != null) {
          return streamMuxer
        }
      }
    }

    if (protocols.length) {
      throw new InvalidCryptoExchangeError('Early muxer negotiation was requested but the initiator and responder had no common muxers')
    }
  }

  /**
   * Decrypt incoming data (handshake as responder).
   *
   * @param connection - streaming iterable duplex that will be encrypted
   * @param options
   * @param options.remotePeer - PeerId of the remote peer. Used to validate the integrity of the remote peer
   * @param options.signal - Used to abort the operation
   */
  async secureInbound <Stream extends MessageStream = MultiaddrConnection> (connection: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<INoiseExtensions>> {
    const log = connection.log?.newScope('noise') ?? this.log
    const wrappedConnection = lpStream(connection, {
      lengthEncoder: uint16BEEncode,
      lengthDecoder: uint16BEDecode,
      maxDataLength: NOISE_MSG_MAX_LENGTH_BYTES
    })

    const handshake = await this.performHandshakeResponder(
      wrappedConnection,
      this.components.privateKey,
      log,
      options?.remotePeer?.publicKey,
      options
    )
    const publicKey = publicKeyFromProtobuf(handshake.payload.identityKey)

    return {
      connection: toMessageStream(wrappedConnection.unwrap(), handshake, this.metrics),
      remoteExtensions: handshake.payload.extensions,
      remotePeer: peerIdFromPublicKey(publicKey),
      streamMuxer: options?.skipStreamMuxerNegotiation === true ? undefined : this.getStreamMuxer(handshake.payload.extensions?.streamMuxers)
    }
  }

  /**
   * Perform XX handshake as initiator.
   */
  private async performHandshakeInitiator (
    connection: LengthPrefixedStream,
    // TODO: pass private key in noise constructor via Components
    privateKey: PrivateKey,
    log: Logger,
    remoteIdentityKey?: PublicKey,
    options?: SecureConnectionOptions
  ): Promise<HandshakeResult> {
    let result: HandshakeResult
    const streamMuxers = options?.skipStreamMuxerNegotiation === true ? [] : [...this.components.upgrader.getStreamMuxers().keys()]

    try {
      result = await performHandshakeInitiator({
        connection,
        privateKey,
        remoteIdentityKey,
        log: log.newScope('xxhandshake'),
        crypto: this.crypto,
        prologue: this.prologue,
        s: this.staticKey,
        extensions: {
          streamMuxers,
          webtransportCerthashes: [],
          ...this.extensions
        }
      }, options)
      this.metrics?.xxHandshakeSuccesses.increment()
    } catch (e: unknown) {
      this.metrics?.xxHandshakeErrors.increment()
      throw e
    }

    return result
  }

  /**
   * Perform XX handshake as responder.
   */
  private async performHandshakeResponder (
    connection: LengthPrefixedStream,
    privateKey: PrivateKey,
    log: Logger,
    remoteIdentityKey?: PublicKey,
    options?: SecureConnectionOptions
  ): Promise<HandshakeResult> {
    let result: HandshakeResult
    const streamMuxers = options?.skipStreamMuxerNegotiation === true ? [] : [...this.components.upgrader.getStreamMuxers().keys()]

    try {
      result = await performHandshakeResponder({
        connection,
        privateKey,
        remoteIdentityKey,
        log: log.newScope('xxhandshake'),
        crypto: this.crypto,
        prologue: this.prologue,
        s: this.staticKey,
        extensions: {
          streamMuxers,
          webtransportCerthashes: [],
          ...this.extensions
        }
      }, options)
      this.metrics?.xxHandshakeSuccesses.increment()
    } catch (e: unknown) {
      this.metrics?.xxHandshakeErrors.increment()
      throw e
    }

    return result
  }
}
