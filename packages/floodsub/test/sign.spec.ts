import { createCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { RPC } from '../src/message/rpc.ts'
import {
  signMessage,
  SignPrefix,
  verifySignature
} from '../src/sign.ts'
import { randomSeqno, toRpcMessage } from '../src/utils.ts'
import type { PubSubRPCMessage } from '../src/floodsub.ts'
import type { Message, SignedMessage } from '../src/index.ts'
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
    expect(signedMessage.key.toProtobuf()).to.equalBytes(peerId.publicKey)

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from an inlined key', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])
    const secPrivateKey = await generateKeyPair('secp256k1', { getCrypto })
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
    }, encodeMessage, { getCrypto })
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
    expect(signedMessage.key.toProtobuf()).to.equalBytes(peerId.publicKey)

    // Verify the signature
    const verified = await verifySignature({
      ...signedMessage,
      from: peerId
    }, encodeMessage)
    expect(verified).to.eql(true)
  })
})

describe('author key binding', () => {
  const topic = 'test-topic'
  const data = uint8ArrayFromString('hello')

  // a message whose `from` is the victim but which is signed by, and carries
  // the public key of, the attacker
  async function forge (victim: PeerId, attackerKey: PrivateKey): Promise<SignedMessage> {
    // @ts-expect-error signature and key are added below
    const message: SignedMessage = {
      type: 'signed',
      from: victim,
      data,
      sequenceNumber: randomSeqno(),
      topic
    }
    const bytes = uint8ArrayConcat([SignPrefix, encodeMessage(toRpcMessage(message)).subarray()])
    message.signature = await attackerKey.sign(bytes)
    message.key = attackerKey.publicKey
    return message
  }

  it('rejects a message whose key does not derive to the Ed25519 author', async () => {
    const victim = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const forged = await forge(victim, await generateKeyPair('Ed25519'))

    await expect(verifySignature(forged, encodeMessage)).to.eventually.equal(false)
  })

  it('does not verify a message from an unsupported key type', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])
    const secPrivateKey = await generateKeyPair('secp256k1', { getCrypto })
    const signed = await signMessage(secPrivateKey, { from: peerIdFromPrivateKey(secPrivateKey), topic, data, sequenceNumber: randomSeqno() }, encodeMessage)

    await expect(verifySignature(signed, encodeMessage)).to.eventually.equal(false)
    await expect(verifySignature(signed, encodeMessage, { getCrypto })).to.eventually.equal(true)
  })

  it('rejects a message whose key does not derive to the secp256k1 author', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])
    const victim = peerIdFromPrivateKey(await generateKeyPair('secp256k1', { getCrypto }))
    const forged = await forge(victim, await generateKeyPair('Ed25519'))

    await expect(verifySignature(forged, encodeMessage, { getCrypto })).to.eventually.equal(false)
  })

  // an RSA peer id does not carry its public key, so the message key is the only
  // source and must derive to the author
  describe('peer id without an inline public key (RSA)', () => {
    let rsaKey: PrivateKey
    let author: PeerId

    before(async () => {
      rsaKey = await generateKeyPair('RSA', { bits: 2048 })
      // on the wire `from` is rebuilt from its multihash and carries no key
      author = peerIdFromMultihash(peerIdFromPrivateKey(rsaKey).toMultihash())
    })

    it('accepts a message whose key derives to the author', async () => {
      const signed = await signMessage(rsaKey, { from: author, topic, data, sequenceNumber: randomSeqno() }, encodeMessage)
      // signMessage rebuilds `from` from the private key, so it carries the key;
      // use the wire form so the derive-to-author check is exercised
      signed.from = author

      await expect(verifySignature(signed, encodeMessage)).to.eventually.equal(true)
    })

    it('rejects a message whose key does not derive to the author', async () => {
      const forged = await forge(author, await generateKeyPair('Ed25519'))

      await expect(verifySignature(forged, encodeMessage)).to.eventually.equal(false)
    })
  })
})
