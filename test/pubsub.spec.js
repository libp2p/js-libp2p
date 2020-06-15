/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const sinon = require('sinon')

const PubsubBaseProtocol = require('../src')
const Peer = require('../src/peer')
const { randomSeqno } = require('../src/utils')
const {
  createPeerId,
  createMockRegistrar,
  mockRegistrar,
  PubsubImplementation,
  ConnectionPair
} = require('./utils')

describe('pubsub base protocol', () => {
  describe('should start and stop properly', () => {
    let pubsub
    let sinonMockRegistrar

    beforeEach(async () => {
      const peerId = await createPeerId()
      sinonMockRegistrar = {
        handle: sinon.stub(),
        register: sinon.stub(),
        unregister: sinon.stub()
      }

      pubsub = new PubsubBaseProtocol({
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: peerId,
        registrar: sinonMockRegistrar
      })

      expect(pubsub.peers.size).to.be.eql(0)
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should be able to start and stop', async () => {
      await pubsub.start()
      expect(sinonMockRegistrar.handle.calledOnce).to.be.true()
      expect(sinonMockRegistrar.register.calledOnce).to.be.true()

      await pubsub.stop()
      expect(sinonMockRegistrar.unregister.calledOnce).to.be.true()
    })

    it('starting should not throw if already started', async () => {
      await pubsub.start()
      await pubsub.start()
      expect(sinonMockRegistrar.handle.calledOnce).to.be.true()
      expect(sinonMockRegistrar.register.calledOnce).to.be.true()

      await pubsub.stop()
      expect(sinonMockRegistrar.unregister.calledOnce).to.be.true()
    })

    it('stopping should not throw if not started', async () => {
      await pubsub.stop()
      expect(sinonMockRegistrar.register.calledOnce).to.be.false()
      expect(sinonMockRegistrar.unregister.calledOnce).to.be.false()
    })
  })

  describe('should handle message creation and signing', () => {
    let peerId
    let pubsub

    before(async () => {
      peerId = await createPeerId()
      pubsub = new PubsubBaseProtocol({
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: peerId,
        registrar: mockRegistrar
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('_buildMessage normalizes and signs messages', async () => {
      const message = {
        from: peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      const signedMessage = await pubsub._buildMessage(message)
      const verified = await pubsub.validate(signedMessage)

      expect(verified).to.eql(true)
    })

    it('validate with strict signing off will validate a present signature', async () => {
      const message = {
        from: peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      sinon.stub(pubsub, 'strictSigning').value(false)

      const signedMessage = await pubsub._buildMessage(message)
      const verified = await pubsub.validate(signedMessage)

      expect(verified).to.eql(true)
    })

    it('validate with strict signing requires a signature', async () => {
      const message = {
        from: peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      const verified = await pubsub.validate(message)

      expect(verified).to.eql(false)
    })
  })

  describe('should be able to register two nodes', () => {
    const protocol = '/pubsub/1.0.0'
    let pubsubA, pubsubB
    let peerIdA, peerIdB
    const registrarRecordA = {}
    const registrarRecordB = {}

    // mount pubsub
    beforeEach(async () => {
      peerIdA = await createPeerId()
      peerIdB = await createPeerId()

      pubsubA = new PubsubImplementation(protocol, peerIdA, createMockRegistrar(registrarRecordA))
      pubsubB = new PubsubImplementation(protocol, peerIdB, createMockRegistrar(registrarRecordB))
    })

    // start pubsub
    beforeEach(async () => {
      await Promise.all([
        pubsubA.start(),
        pubsubB.start()
      ])

      expect(Object.keys(registrarRecordA)).to.have.lengthOf(1)
      expect(Object.keys(registrarRecordB)).to.have.lengthOf(1)
    })

    afterEach(() => {
      sinon.restore()

      return Promise.all([
        pubsubA.stop(),
        pubsubB.stop()
      ])
    })

    it('should handle onConnect as expected', async () => {
      const onConnectA = registrarRecordA[protocol].onConnect
      const handlerB = registrarRecordB[protocol].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()

      await onConnectA(peerIdB, c0)
      await handlerB({
        protocol,
        stream: c1.stream,
        connection: {
          remotePeer: peerIdA
        }
      })

      expect(pubsubA.peers.size).to.be.eql(1)
      expect(pubsubB.peers.size).to.be.eql(1)
    })

    it('should not create a new stream if onConnect is called twice', async () => {
      const onConnectA = registrarRecordA[protocol].onConnect
      const handlerB = registrarRecordB[protocol].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()

      const spyNewStream = sinon.spy(c0, 'newStream')

      await onConnectA(peerIdB, c0)
      await handlerB({
        protocol,
        stream: c1.stream,
        connection: {
          remotePeer: peerIdA
        }
      })
      expect(spyNewStream).to.have.property('callCount', 1)

      await onConnectA(peerIdB, c0)
      expect(spyNewStream).to.have.property('callCount', 1)
    })

    it('should handle newStream errors in onConnect', async () => {
      const onConnectA = registrarRecordA[protocol].onConnect
      const handlerB = registrarRecordB[protocol].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()
      const error = new Error('new stream error')
      sinon.stub(c0, 'newStream').throws(error)

      await onConnectA(peerIdB, c0)
      await handlerB({
        protocol,
        stream: c1.stream,
        connection: {
          remotePeer: peerIdA
        }
      })

      expect(c0.newStream).to.have.property('callCount', 1)
    })

    it('should handle onDisconnect as expected', async () => {
      const onConnectA = registrarRecordA[protocol].onConnect
      const onDisconnectA = registrarRecordA[protocol].onDisconnect
      const handlerB = registrarRecordB[protocol].handler
      const onDisconnectB = registrarRecordB[protocol].onDisconnect

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()

      await onConnectA(peerIdB, c0)
      await handlerB({
        protocol,
        stream: c1.stream,
        connection: {
          remotePeer: peerIdA
        }
      })

      // Notice peers of disconnect
      onDisconnectA(peerIdB)
      onDisconnectB(peerIdA)

      expect(pubsubA.peers.size).to.be.eql(0)
      expect(pubsubB.peers.size).to.be.eql(0)
    })

    it('should handle onDisconnect for unknown peers', () => {
      const onDisconnectA = registrarRecordA[protocol].onDisconnect

      expect(pubsubA.peers.size).to.be.eql(0)

      // Notice peers of disconnect
      onDisconnectA(peerIdB)

      expect(pubsubA.peers.size).to.be.eql(0)
    })
  })

  describe('getSubscribers', () => {
    let peerId
    let pubsub

    beforeEach(async () => {
      peerId = await createPeerId()
      pubsub = new PubsubBaseProtocol({
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: peerId,
        registrar: mockRegistrar
      })
    })

    afterEach(() => pubsub.stop())

    it('should fail if pubsub is not started', () => {
      const topic = 'topic-test'

      try {
        pubsub.getSubscribers(topic)
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NOT_STARTED_YET')
        return
      }
      throw new Error('should fail if pubsub is not started')
    })

    it('should fail if no topic is provided', async () => {
      // start pubsub
      await pubsub.start()

      try {
        pubsub.getSubscribers()
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NOT_VALID_TOPIC')
        return
      }
      throw new Error('should fail if no topic is provided')
    })

    it('should get peer subscribed to one topic', async () => {
      const topic = 'topic-test'

      // start pubsub
      await pubsub.start()

      let peersSubscribed = pubsub.getSubscribers(topic)
      expect(peersSubscribed).to.be.empty()

      // Set mock peer subscribed
      const peer = new Peer({ id: peerId })
      const id = peer.id.toB58String()

      peer.topics.add(topic)
      pubsub.peers.set(id, peer)

      peersSubscribed = pubsub.getSubscribers(topic)

      expect(peersSubscribed).to.not.be.empty()
      expect(peersSubscribed[0]).to.eql(id)
    })
  })
})
