/* eslint-env mocha */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { randomSeqno } from '../src/utils.js'
import {
  MockRegistrar,
  PubsubImplementation
} from './utils/index.js'
import type { PeerId, Message } from '@libp2p/interface'

describe('pubsub base messages', () => {
  let peerId: PeerId
  let pubsub: PubsubImplementation

  before(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    peerId = await createFromPrivKey(privateKey)

    pubsub = new PubsubImplementation({
      peerId,
      privateKey,
      registrar: new MockRegistrar(),
      logger: defaultLogger()
    }, {
      multicodecs: ['/pubsub/1.0.0']
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('buildMessage normalizes and signs messages', async () => {
    const message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic',
      sequenceNumber: randomSeqno()
    }

    const signedMessage = await pubsub.buildMessage(message)

    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will reject a message with from, signature, key, seqno present', async () => {
    const message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic',
      sequenceNumber: randomSeqno()
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictSign')

    const signedMessage = await pubsub.buildMessage(message)

    if (signedMessage.type === 'unsigned') {
      throw new Error('Message was not signed')
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.be.rejected()
    // @ts-expect-error this field is not optional
    delete signedMessage.from
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.be.rejected()
    // @ts-expect-error this field is not optional
    delete signedMessage.signature
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.be.rejected()
    // @ts-expect-error this field is not optional
    delete signedMessage.key
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.be.rejected()
    // @ts-expect-error this field is not optional
    delete signedMessage.sequenceNumber
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will validate a message without a signature, key, and seqno', async () => {
    const message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic',
      sequenceNumber: randomSeqno()
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')

    const signedMessage = await pubsub.buildMessage(message)
    await expect(pubsub.validate(peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictSign requires a signature', async () => {
    // @ts-expect-error incomplete implementation
    const message: Message = {
      type: 'signed',
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    await expect(pubsub.validate(peerId, message)).to.be.rejectedWith(Error, 'Signing required and no signature was present')
  })
})
