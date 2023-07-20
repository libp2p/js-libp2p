import { InvalidCryptoExchangeError, UnexpectedPeerError } from '@libp2p/interface/errors'
import { decode0, decode1, decode2, encode0, encode1, encode2 } from './encoder.js'
import { XX } from './handshakes/xx.js'
import {
  logger,
  logLocalStaticKeys,
  logLocalEphemeralKeys,
  logRemoteEphemeralKey,
  logRemoteStaticKey,
  logCipherState
} from './logger.js'
import {
  decodePayload,
  getPeerIdFromPayload,
  verifySignedPayload
} from './utils.js'
import type { bytes, bytes32 } from './@types/basic.js'
import type { IHandshake } from './@types/handshake-interface.js'
import type { CipherState, NoiseSession } from './@types/handshake.js'
import type { KeyPair } from './@types/libp2p.js'
import type { ICryptoInterface } from './crypto.js'
import type { NoiseExtensions } from './proto/payload.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { LengthPrefixedStream } from 'it-length-prefixed-stream'

export class XXHandshake implements IHandshake {
  public isInitiator: boolean
  public session: NoiseSession
  public remotePeer!: PeerId
  public remoteExtensions: NoiseExtensions = { webtransportCerthashes: [] }

  protected payload: bytes
  protected connection: LengthPrefixedStream
  protected xx: XX
  protected staticKeypair: KeyPair

  private readonly prologue: bytes32

  constructor (
    isInitiator: boolean,
    payload: bytes,
    prologue: bytes32,
    crypto: ICryptoInterface,
    staticKeypair: KeyPair,
    connection: LengthPrefixedStream,
    remotePeer?: PeerId,
    handshake?: XX
  ) {
    this.isInitiator = isInitiator
    this.payload = payload
    this.prologue = prologue
    this.staticKeypair = staticKeypair
    this.connection = connection
    if (remotePeer) {
      this.remotePeer = remotePeer
    }
    this.xx = handshake ?? new XX(crypto)
    this.session = this.xx.initSession(this.isInitiator, this.prologue, this.staticKeypair)
  }

  // stage 0
  public async propose (): Promise<void> {
    logLocalStaticKeys(this.session.hs.s)
    if (this.isInitiator) {
      logger.trace('Stage 0 - Initiator starting to send first message.')
      const messageBuffer = this.xx.sendMessage(this.session, new Uint8Array(0))
      await this.connection.write(encode0(messageBuffer))
      logger.trace('Stage 0 - Initiator finished sending first message.')
      logLocalEphemeralKeys(this.session.hs.e)
    } else {
      logger.trace('Stage 0 - Responder waiting to receive first message...')
      const receivedMessageBuffer = decode0((await this.connection.read()).subarray())
      const { valid } = this.xx.recvMessage(this.session, receivedMessageBuffer)
      if (!valid) {
        throw new InvalidCryptoExchangeError('xx handshake stage 0 validation fail')
      }
      logger.trace('Stage 0 - Responder received first message.')
      logRemoteEphemeralKey(this.session.hs.re)
    }
  }

  // stage 1
  public async exchange (): Promise<void> {
    if (this.isInitiator) {
      logger.trace('Stage 1 - Initiator waiting to receive first message from responder...')
      const receivedMessageBuffer = decode1((await this.connection.read()).subarray())
      const { plaintext, valid } = this.xx.recvMessage(this.session, receivedMessageBuffer)
      if (!valid) {
        throw new InvalidCryptoExchangeError('xx handshake stage 1 validation fail')
      }
      logger.trace('Stage 1 - Initiator received the message.')
      logRemoteEphemeralKey(this.session.hs.re)
      logRemoteStaticKey(this.session.hs.rs)

      logger.trace("Initiator going to check remote's signature...")
      try {
        const decodedPayload = decodePayload(plaintext)
        this.remotePeer = this.remotePeer || await getPeerIdFromPayload(decodedPayload)
        await verifySignedPayload(this.session.hs.rs, decodedPayload, this.remotePeer)
        this.setRemoteNoiseExtension(decodedPayload.extensions)
      } catch (e) {
        const err = e as Error
        throw new UnexpectedPeerError(`Error occurred while verifying signed payload: ${err.message}`)
      }
      logger.trace('All good with the signature!')
    } else {
      logger.trace('Stage 1 - Responder sending out first message with signed payload and static key.')
      const messageBuffer = this.xx.sendMessage(this.session, this.payload)
      await this.connection.write(encode1(messageBuffer))
      logger.trace('Stage 1 - Responder sent the second handshake message with signed payload.')
      logLocalEphemeralKeys(this.session.hs.e)
    }
  }

  // stage 2
  public async finish (): Promise<void> {
    if (this.isInitiator) {
      logger.trace('Stage 2 - Initiator sending third handshake message.')
      const messageBuffer = this.xx.sendMessage(this.session, this.payload)
      await this.connection.write(encode2(messageBuffer))
      logger.trace('Stage 2 - Initiator sent message with signed payload.')
    } else {
      logger.trace('Stage 2 - Responder waiting for third handshake message...')
      const receivedMessageBuffer = decode2((await this.connection.read()).subarray())
      const { plaintext, valid } = this.xx.recvMessage(this.session, receivedMessageBuffer)
      if (!valid) {
        throw new InvalidCryptoExchangeError('xx handshake stage 2 validation fail')
      }
      logger.trace('Stage 2 - Responder received the message, finished handshake.')

      try {
        const decodedPayload = decodePayload(plaintext)
        this.remotePeer = this.remotePeer || await getPeerIdFromPayload(decodedPayload)
        await verifySignedPayload(this.session.hs.rs, decodedPayload, this.remotePeer)
        this.setRemoteNoiseExtension(decodedPayload.extensions)
      } catch (e) {
        const err = e as Error
        throw new UnexpectedPeerError(`Error occurred while verifying signed payload: ${err.message}`)
      }
    }
    logCipherState(this.session)
  }

  public encrypt (plaintext: Uint8Array, session: NoiseSession): bytes {
    const cs = this.getCS(session)

    return this.xx.encryptWithAd(cs, new Uint8Array(0), plaintext)
  }

  public decrypt (ciphertext: Uint8Array, session: NoiseSession, dst?: Uint8Array): { plaintext: bytes, valid: boolean } {
    const cs = this.getCS(session, false)

    return this.xx.decryptWithAd(cs, new Uint8Array(0), ciphertext, dst)
  }

  public getRemoteStaticKey (): bytes {
    return this.session.hs.rs
  }

  private getCS (session: NoiseSession, encryption = true): CipherState {
    if (!session.cs1 || !session.cs2) {
      throw new InvalidCryptoExchangeError('Handshake not completed properly, cipher state does not exist.')
    }

    if (this.isInitiator) {
      return encryption ? session.cs1 : session.cs2
    } else {
      return encryption ? session.cs2 : session.cs1
    }
  }

  protected setRemoteNoiseExtension (e: NoiseExtensions | null | undefined): void {
    if (e) {
      this.remoteExtensions = e
    }
  }
}
