import { decode } from 'it-length-prefixed'
import { lpStream, type LengthPrefixedStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { NOISE_MSG_MAX_LENGTH_BYTES } from './constants.js'
import { pureJsCrypto } from './crypto/js.js'
import { decryptStream, encryptStream } from './crypto/streaming.js'
import { uint16BEDecode, uint16BEEncode } from './encoder.js'
import { XXHandshake } from './handshake-xx.js'
import { type MetricsRegistry, registerMetrics } from './metrics.js'
import { getPayload } from './utils.js'
import type { bytes } from './@types/basic.js'
import type { IHandshake } from './@types/handshake-interface.js'
import type { INoiseConnection, KeyPair } from './@types/libp2p.js'
import type { ICryptoInterface } from './crypto.js'
import type { NoiseExtensions } from './proto/payload.js'
import type { SecuredConnection } from '@libp2p/interface/connection-encrypter'
import type { Metrics } from '@libp2p/interface/metrics'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Duplex, Source } from 'it-stream-types'

interface HandshakeParams {
  connection: LengthPrefixedStream
  isInitiator: boolean
  localPeer: PeerId
  remotePeer?: PeerId
}

export interface NoiseInit {
  /**
   * x25519 private key, reuse for faster handshakes
   */
  staticNoiseKey?: bytes
  extensions?: NoiseExtensions
  crypto?: ICryptoInterface
  prologueBytes?: Uint8Array
  metrics?: Metrics
}

export class Noise implements INoiseConnection {
  public protocol = '/noise'
  public crypto: ICryptoInterface

  private readonly prologue: Uint8Array
  private readonly staticKeys: KeyPair
  private readonly extensions?: NoiseExtensions
  private readonly metrics?: MetricsRegistry

  constructor (init: NoiseInit = {}) {
    const { staticNoiseKey, extensions, crypto, prologueBytes, metrics } = init

    this.crypto = crypto ?? pureJsCrypto
    this.extensions = extensions
    this.metrics = metrics ? registerMetrics(metrics) : undefined

    if (staticNoiseKey) {
      // accepts x25519 private key of length 32
      this.staticKeys = this.crypto.generateX25519KeyPairFromSeed(staticNoiseKey)
    } else {
      this.staticKeys = this.crypto.generateX25519KeyPair()
    }
    this.prologue = prologueBytes ?? new Uint8Array(0)
  }

  /**
   * Encrypt outgoing data to the remote party (handshake as initiator)
   *
   * @param {PeerId} localPeer - PeerId of the receiving peer
   * @param {Duplex<AsyncGenerator<Uint8Array>, AsyncIterable<Uint8Array>, Promise<void>>} connection - streaming iterable duplex that will be encrypted
   * @param {PeerId} remotePeer - PeerId of the remote peer. Used to validate the integrity of the remote peer.
   * @returns {Promise<SecuredConnection>}
   */
  public async secureOutbound (localPeer: PeerId, connection: Duplex<AsyncGenerator<Uint8Array>, AsyncIterable<Uint8Array>, Promise<void>>, remotePeer?: PeerId): Promise<SecuredConnection<NoiseExtensions>> {
    const wrappedConnection = lpStream(
      connection,
      {
        lengthEncoder: uint16BEEncode,
        lengthDecoder: uint16BEDecode,
        maxDataLength: NOISE_MSG_MAX_LENGTH_BYTES
      }
    )
    const handshake = await this.performHandshake({
      connection: wrappedConnection,
      isInitiator: true,
      localPeer,
      remotePeer
    })
    const conn = await this.createSecureConnection(wrappedConnection, handshake)

    return {
      conn,
      remoteExtensions: handshake.remoteExtensions,
      remotePeer: handshake.remotePeer
    }
  }

  /**
   * Decrypt incoming data (handshake as responder).
   *
   * @param {PeerId} localPeer - PeerId of the receiving peer.
   * @param {Duplex<AsyncGenerator<Uint8Array>, AsyncIterable<Uint8Array>, Promise<void>>} connection - streaming iterable duplex that will be encryption.
   * @param {PeerId} remotePeer - optional PeerId of the initiating peer, if known. This may only exist during transport upgrades.
   * @returns {Promise<SecuredConnection>}
   */
  public async secureInbound (localPeer: PeerId, connection: Duplex<AsyncGenerator<Uint8Array>, AsyncIterable<Uint8Array>, Promise<void>>, remotePeer?: PeerId): Promise<SecuredConnection<NoiseExtensions>> {
    const wrappedConnection = lpStream(
      connection,
      {
        lengthEncoder: uint16BEEncode,
        lengthDecoder: uint16BEDecode,
        maxDataLength: NOISE_MSG_MAX_LENGTH_BYTES
      }
    )
    const handshake = await this.performHandshake({
      connection: wrappedConnection,
      isInitiator: false,
      localPeer,
      remotePeer
    })
    const conn = await this.createSecureConnection(wrappedConnection, handshake)

    return {
      conn,
      remotePeer: handshake.remotePeer,
      remoteExtensions: handshake.remoteExtensions
    }
  }

  /**
   * If Noise pipes supported, tries IK handshake first with XX as fallback if it fails.
   * If noise pipes disabled or remote peer static key is unknown, use XX.
   *
   * @param {HandshakeParams} params
   */
  private async performHandshake (params: HandshakeParams): Promise<IHandshake> {
    const payload = await getPayload(params.localPeer, this.staticKeys.publicKey, this.extensions)

    // run XX handshake
    return this.performXXHandshake(params, payload)
  }

  private async performXXHandshake (
    params: HandshakeParams,
    payload: bytes
  ): Promise<XXHandshake> {
    const { isInitiator, remotePeer, connection } = params
    const handshake = new XXHandshake(
      isInitiator,
      payload,
      this.prologue,
      this.crypto,
      this.staticKeys,
      connection,
      remotePeer
    )

    try {
      await handshake.propose()
      await handshake.exchange()
      await handshake.finish()
      this.metrics?.xxHandshakeSuccesses.increment()
    } catch (e: unknown) {
      this.metrics?.xxHandshakeErrors.increment()
      if (e instanceof Error) {
        e.message = `Error occurred during XX handshake: ${e.message}`
        throw e
      }
    }

    return handshake
  }

  private async createSecureConnection (
    connection: LengthPrefixedStream<Duplex<AsyncGenerator<Uint8Array>, AsyncIterable<Uint8Array>, Promise<void>>>,
    handshake: IHandshake
  ): Promise<Duplex<AsyncGenerator<Uint8Array>, Source<Uint8Array>, Promise<void>>> {
    // Create encryption box/unbox wrapper
    const [secure, user] = duplexPair<Uint8Array>()
    const network = connection.unwrap()

    await pipe(
      secure, // write to wrapper
      encryptStream(handshake, this.metrics), // encrypt data + prefix with message length
      network, // send to the remote peer
      (source) => decode(source, { lengthDecoder: uint16BEDecode }), // read message length prefix
      decryptStream(handshake, this.metrics), // decrypt the incoming data
      secure // pipe to the wrapper
    )

    return user
  }
}
