import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { RPC } from '../src/message/rpc.ts'
import {
  signMessage,
  SignPrefix,
  verifySignature
} from '../src/sign.ts'
import { bigIntToBytes, randomSeqno, toRpcMessage } from '../src/utils.ts'
import type { PubSubRPCMessage } from '../src/floodsub.ts'
import type { Message } from '../src/index.ts'
import type { PeerId, PrivateKey } from '@libp2p/interface'

function encodeMessage (message: PubSubRPCMessage): Uint8Array {
  return RPC.Message.encode(message)
}

describe('message signing', () => {
  let privateKey: PrivateKey
  let peerId: PeerId

  before(async () => {
    privateKey = await generateKeyPair('Ed25519')
    peerId = peerIdFromPrivateKey(privateKey)
  })

  it('should be able to sign and verify a message', async () => {
    // @ts-expect-error incomplete implementation
    const message: Message = {
      type: 'signed',
      from: peerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])

    const expectedSignature = await privateKey.sign(bytesToSign)

    // @ts-expect-error missing fields
    const signedMessage = await signMessage(privateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.equalBytes(expectedSignature)
    expect(signedMessage.key.equals(peerId.publicKey)).to.be.true()

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from an inlined key', async () => {
    const secPrivateKey = await generateKeyPair('secp256k1')
    const secPeerId = peerIdFromPrivateKey(secPrivateKey)

    // @ts-expect-error incomplete implementation
    const message: Message = {
      type: 'signed',
      from: secPeerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])
    const expectedSignature = await secPrivateKey.sign(bytesToSign)
    // @ts-expect-error required field
    const signedMessage = await signMessage(secPrivateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.eql(expectedSignature)
    // @ts-expect-error required field
    signedMessage.key = undefined

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: secPeerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from the message', async () => {
    // @ts-expect-error incomplete implementation
    const message: Message = {
      type: 'signed',
      from: peerId,
      data: uint8ArrayFromString('hello'),
      sequenceNumber: randomSeqno(),
      topic: 'test-topic'
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, RPC.Message.encode(toRpcMessage(message)).subarray()])
    const expectedSignature = await privateKey.sign(bytesToSign)
    // @ts-expect-error missing fields
    const signedMessage = await signMessage(privateKey, message, encodeMessage)

    // Check the signature and public key
    expect(signedMessage.signature).to.equalBytes(expectedSignature)
    expect(signedMessage.key.equals(peerId.publicKey)).to.be.true()

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should reject a supplied public key that does not match the from peer id', async () => {
    const attackerKey = await generateKeyPair('Ed25519')
    const victimKey = await generateKeyPair('Ed25519')
    const victim = peerIdFromPrivateKey(victimKey)
    const data = uint8ArrayFromString('forged message')
    const sequenceNumber = 1n
    const sequenceNumberBytes = bigIntToBytes(sequenceNumber)
    const rpcMessage = {
      from: victim.toMultihash().bytes,
      data,
      sequenceNumber: sequenceNumberBytes,
      topic: 'test-topic',
      signature: undefined,
      key: undefined
    }

    const signature = await attackerKey.sign(uint8ArrayConcat([SignPrefix, encodeMessage(rpcMessage).subarray()]))

    await expect(verifySignature({
      type: 'signed',
      from: victim,
      data,
      sequenceNumber,
      topic: 'test-topic',
      signature,
      key: attackerKey.publicKey
    }, encodeMessage)).to.eventually.be.rejectedWith('Public key did not match the originator id')
  })
})
