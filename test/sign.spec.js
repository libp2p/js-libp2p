/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const uint8ArrayConcat = require('uint8arrays/concat')
const uint8ArrayFromString = require('uint8arrays/from-string')

const { Message } = require('../src/message')
const {
  signMessage,
  SignPrefix,
  verifySignature
} = require('../src/message/sign')
const PeerId = require('peer-id')
const { randomSeqno } = require('../src/utils')

describe('message signing', () => {
  let peerId
  before(async () => {
    peerId = await PeerId.create({
      bits: 1024
    })
  })

  it('should be able to sign and verify a message', async () => {
    const message = {
      from: peerId.id,
      data: uint8ArrayFromString('hello'),
      seqno: randomSeqno(),
      topicIDs: ['test-topic']
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, Message.encode(message)])
    const expectedSignature = await peerId.privKey.sign(bytesToSign)

    const signedMessage = await signMessage(peerId, message)

    // Check the signature and public key
    expect(signedMessage.signature).to.eql(expectedSignature)
    expect(signedMessage.key).to.eql(peerId.pubKey.bytes)

    // Verify the signature
    const verified = await verifySignature(signedMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from an inlined key', async () => {
    const secPeerId = await PeerId.create({ keyType: 'secp256k1', bits: 256 })

    const message = {
      from: secPeerId.id,
      data: uint8ArrayFromString('hello'),
      seqno: randomSeqno(),
      topicIDs: ['test-topic']
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, Message.encode(message)])
    const expectedSignature = await secPeerId.privKey.sign(bytesToSign)

    const signedMessage = await signMessage(secPeerId, message)

    // Check the signature and public key
    expect(signedMessage.signature).to.eql(expectedSignature)
    signedMessage.key = undefined

    // Verify the signature
    const verified = await verifySignature(signedMessage)
    expect(verified).to.eql(true)
  })

  it('should be able to extract the public key from the message', async () => {
    const message = {
      from: peerId.id,
      data: uint8ArrayFromString('hello'),
      seqno: randomSeqno(),
      topicIDs: ['test-topic']
    }

    const bytesToSign = uint8ArrayConcat([SignPrefix, Message.encode(message)])
    const expectedSignature = await peerId.privKey.sign(bytesToSign)

    const signedMessage = await signMessage(peerId, message)

    // Check the signature and public key
    expect(signedMessage.signature).to.eql(expectedSignature)
    expect(signedMessage.key).to.eql(peerId.pubKey.bytes)

    // Verify the signature
    const verified = await verifySignature(signedMessage)
    expect(verified).to.eql(true)
  })
})
