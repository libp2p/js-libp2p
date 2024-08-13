import { generateKeyPair } from '@libp2p/crypto/keys'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import {
  signMessage,
  SignPrefix,
  verifySignature
} from '../src/sign.js'
import { randomSeqno, toRpcMessage } from '../src/utils.js'
import { RPC } from './message/rpc.js'
import type { PeerId, PrivateKey, PubSubRPCMessage } from '@libp2p/interface'

function encodeMessage (message: PubSubRPCMessage): Uint8Array {
  return RPC.Message.encode(message)
}

describe('message signing', () => {
  let privateKey: PrivateKey
  let peerId: PeerId

  before(async () => {
    privateKey = await generateKeyPair('Ed25519')
    peerId = await createFromPrivKey(privateKey)
  })

  it('should be able to sign and verify a message', async () => {
    const message = {
      type: 'signed',
      from: peerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    // @ts-expect-error missing fields
    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])

    const expectedSignature = await privateKey.sign(bytesToSign)

    const signedMessage = await signMessage(privateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.equalBytes(expectedSignature)
    expect(signedMessage.key).to.equalBytes(peerId.publicKey)

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from an inlined key', async () => {
    const secPrivateKey = await generateKeyPair('secp256k1')
    const secPeerId = await createFromPrivKey(secPrivateKey)

    const message = {
      type: 'signed',
      from: secPeerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    // @ts-expect-error missing fields
    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])
    const expectedSignature = await secPrivateKey.sign(bytesToSign)
    const signedMessage = await signMessage(secPrivateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.eql(expectedSignature)
    // @ts-expect-error field is required
    signedMessage.key = undefined

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: secPeerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from the message', async () => {
    const message = {
      type: 'signed',
      from: peerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    // @ts-expect-error missing fields
    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])
    const expectedSignature = await privateKey.sign(bytesToSign)
    const signedMessage = await signMessage(privateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.equalBytes(expectedSignature)
    expect(signedMessage.key).to.equalBytes(peerId.publicKey)

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })
})
