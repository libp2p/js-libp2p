/* eslint-env mocha */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub } from '../src/index.js'
import { randomSeqno } from '../src/utils.js'
import type { FloodSub } from '../src/index.js'
import type { PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

describe('pubsub base messages', () => {
  let peerId: PeerId
  let pubsub: FloodSub
  let registrar: StubbedInstance<Registrar>

  before(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    peerId = peerIdFromPrivateKey(privateKey)
    registrar = stubInterface<Registrar>()

    pubsub = floodsub()({
      peerId,
      privateKey,
      registrar,
      logger: defaultLogger()
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

    // @ts-expect-error private method
    const signedMessage = await pubsub['buildMessage'](message)

    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will reject a message with from, signature, key, seqno present', async () => {
    const message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic',
      sequenceNumber: randomSeqno()
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictSign')

    // @ts-expect-error private method
    const signedMessage = await pubsub['buildMessage'](message)

    if (signedMessage.type === 'unsigned') {
      throw new Error('Message was not signed')
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.be.rejected()
    delete signedMessage.from
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.be.rejected()
    delete signedMessage.signature
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.be.rejected()
    delete signedMessage.key
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.be.rejected()
    delete signedMessage.sequenceNumber
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictNoSign will validate a message without a signature, key, and seqno', async () => {
    const message = {
      from: peerId,
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic',
      sequenceNumber: randomSeqno()
    }

    sinon.stub(pubsub, 'globalSignaturePolicy').value('StrictNoSign')

    // @ts-expect-error private method
    const signedMessage = await pubsub['buildMessage'](message)
    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, signedMessage)).to.eventually.not.be.rejected()
  })

  it('validate with StrictSign requires a signature', async () => {
    // @ts-expect-error incomplete implementation
    const message: Message = {
      type: 'signed',
      data: uint8ArrayFromString('hello'),
      topic: 'test-topic'
    }

    // @ts-expect-error private method
    await expect(pubsub['validate'](peerId, message)).to.be.rejectedWith(Error, 'Signing required and no signature was present')
  })
})
