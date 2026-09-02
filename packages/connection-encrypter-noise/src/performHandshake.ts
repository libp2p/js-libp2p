import {
  logLocalStaticKeys,
  logLocalEphemeralKeys,
  logRemoteEphemeralKey,
  logRemoteStaticKey,
  logCipherState
} from './logger.js'
import { ZEROLEN, XXHandshakeState } from './protocol.js'
import { createHandshakePayload, decodeHandshakePayload } from './utils.js'
import type { HandshakeResult, HandshakeParams } from './types.js'
import type { AbortOptions } from '@libp2p/interface'

export async function performHandshakeInitiator (init: HandshakeParams, options?: AbortOptions): Promise<HandshakeResult> {
  const { log, connection, crypto, privateKey, prologue, s, remoteIdentityKey, extensions } = init

  const payload = await createHandshakePayload(privateKey, s.publicKey, extensions)
  const xx = new XXHandshakeState({
    crypto,
    protocolName: 'Noise_XX_25519_ChaChaPoly_SHA256',
    initiator: true,
    prologue,
    s
  })

  logLocalStaticKeys(xx.s, log)
  log.trace('Stage 0 - Initiator starting to send first message.')
  await connection.write(xx.writeMessageA(ZEROLEN), options)
  log.trace('Stage 0 - Initiator finished sending first message.')
  logLocalEphemeralKeys(xx.e, log)

  log.trace('Stage 1 - Initiator waiting to receive first message from responder...')
  const plaintext = xx.readMessageB(await connection.read(options))
  log.trace('Stage 1 - Initiator received the message.')
  logRemoteEphemeralKey(xx.re, log)
  logRemoteStaticKey(xx.rs, log)

  log.trace("Initiator going to check remote's signature...")
  const receivedPayload = await decodeHandshakePayload(plaintext, xx.rs, remoteIdentityKey)
  log.trace('All good with the signature!')

  log.trace('Stage 2 - Initiator sending third handshake message.')
  await connection.write(xx.writeMessageC(payload), options)
  log.trace('Stage 2 - Initiator sent message with signed payload.')

  const [cs1, cs2] = xx.ss.split()
  logCipherState(cs1, cs2, log)

  return {
    payload: receivedPayload,
    encrypt: (plaintext) => cs1.encryptWithAd(ZEROLEN, plaintext),
    decrypt: (ciphertext, dst) => cs2.decryptWithAd(ZEROLEN, ciphertext, dst)
  }
}

export async function performHandshakeResponder (init: HandshakeParams, options?: AbortOptions): Promise<HandshakeResult> {
  const { log, connection, crypto, privateKey, prologue, s, remoteIdentityKey, extensions } = init

  const payload = await createHandshakePayload(privateKey, s.publicKey, extensions)
  const xx = new XXHandshakeState({
    crypto,
    protocolName: 'Noise_XX_25519_ChaChaPoly_SHA256',
    initiator: false,
    prologue,
    s
  })

  logLocalStaticKeys(xx.s, log)
  log.trace('Stage 0 - Responder waiting to receive first message.')
  xx.readMessageA(await connection.read(options))
  log.trace('Stage 0 - Responder received first message.')
  logRemoteEphemeralKey(xx.re, log)

  log.trace('Stage 1 - Responder sending out first message with signed payload and static key.')
  await connection.write(xx.writeMessageB(payload), options)
  log.trace('Stage 1 - Responder sent the second handshake message with signed payload.')
  logLocalEphemeralKeys(xx.e, log)

  log.trace('Stage 2 - Responder waiting for third handshake message...')
  const plaintext = xx.readMessageC(await connection.read(options))
  log.trace('Stage 2 - Responder received the message, finished handshake.')
  const receivedPayload = await decodeHandshakePayload(plaintext, xx.rs, remoteIdentityKey)

  const [cs1, cs2] = xx.ss.split()
  logCipherState(cs1, cs2, log)

  return {
    payload: receivedPayload,
    encrypt: (plaintext) => cs2.encryptWithAd(ZEROLEN, plaintext),
    decrypt: (ciphertext, dst) => cs1.decryptWithAd(ZEROLEN, ciphertext, dst)
  }
}
