/* eslint-env mocha */
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import {
  createPeerId,
  MockRegistrar,
  PubsubImplementation
} from './utils/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Message } from '@libp2p/interface-pubsub'
import { Components } from '@libp2p/components'

describe('pubsub base messages', () => {
  let peerId: PeerId
  let pubsub: PubsubImplementation

  before(async () => {
    peerId = await createPeerId()
    pubsub = new PubsubImplementation({
      multicodecs: ['/pubsub/1.0.0']
    })
    pubsub.init(new Components({
      peerId: peerId,
      registrar: new MockRegistrar()
    }))
  })

  afterEach(() => {
    sinon.restore()
  })

  it('buildMessage normalizes and signs messages', async () => {
    const message: Message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    const signedMessage = await pubsub.buildMessage(message)

    await expect(pubsub.validate(signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will reject a message with from, signature, key, seqno present', async () => {
    const message: Message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictSign')

    const signedMessage = await pubsub.buildMessage(message)

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')
    await expect(pubsub.validate(signedMessage)).to.eventually.be.rejected()
    // @ts-expect-error this field is not optional
    delete signedMessage.from
    await expect(pubsub.validate(signedMessage)).to.eventually.be.rejected()
    delete signedMessage.signature
    await expect(pubsub.validate(signedMessage)).to.eventually.be.rejected()
    delete signedMessage.key
    await expect(pubsub.validate(signedMessage)).to.eventually.be.rejected()
    delete signedMessage.sequenceNumber
    await expect(pubsub.validate(signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will validate a message without a signature, key, and seqno', async () => {
    const message: Message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')

    const signedMessage = await pubsub.buildMessage(message)
    await expect(pubsub.validate(signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictSign requires a signature', async () => {
    const message: Message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    await expect(pubsub.validate(message)).to.be.rejectedWith(Error, 'Signing required and no signature was present')
  })
})
