/* eslint max-nested-callbacks: ["error", 6] */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub } from '../src/index.js'
import { PeerStreams } from '../src/peer-streams.js'
import { noSignMsgId } from '../src/utils.js'
import { connectionPair } from './fixtures/connection.js'
import type { PubSubRPC } from '../src/floodsub.js'
import type { FloodSub, FloodSubComponents, Message } from '../src/index.js'
import type { PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const topic = 'test-topic'
const message = uint8ArrayFromString('hello')

describe('pubsub base implementation', () => {
  describe('publish', () => {
    let pubsub: FloodSub
    let registrar: StubbedInstance<Registrar>
    let components: FloodSubComponents

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)
      registrar = stubInterface<Registrar>()
      components = {
        peerId,
        privateKey,
        registrar,
        logger: defaultLogger()
      }

      pubsub = floodsub({
        emitSelf: true
      })(components)
    })

    afterEach(async () => {
      await stop(pubsub)
    })

    it('calls _publish for router to forward messages', async () => {
      // @ts-expect-error private method
      sinon.spy(pubsub, 'publishMessage')

      await start(pubsub)
      await pubsub.publish(topic, message)

      // event dispatch is async
      await pWaitFor(() => {
        // @ts-expect-error .callCount is a added by sinon
        return pubsub.publishMessage.callCount === 1
      })

      // @ts-expect-error .callCount is a added by sinon
      expect(pubsub.publishMessage.callCount).to.eql(1)
    })

    it('should sign messages on publish', async () => {
      // @ts-expect-error private method
      const publishMessageSpy = sinon.spy(pubsub, 'publishMessage')

      await start(pubsub)
      await pubsub.publish(topic, message)

      // event dispatch is async
      await pWaitFor(() => {
        return publishMessageSpy.callCount === 1
      })

      // Get the first message sent to _publish, and validate it
      const signedMessage: Message = publishMessageSpy.getCall(0).lastArg

      // @ts-expect-error private method
      await expect(pubsub['validate'](components.peerId, signedMessage)).to.eventually.be.undefined()
    })

    it('calls publishes messages twice', async () => {
      let count = 0

      await start(pubsub)
      pubsub.subscribe(topic)

      pubsub.addEventListener('message', evt => {
        if (evt.detail.topic === topic) {
          count++
        }
      })
      await pubsub.publish(topic, message)
      await pubsub.publish(topic, message)

      // event dispatch is async
      await pWaitFor(() => {
        return count === 2
      })

      expect(count).to.eql(2)
    })
  })

  describe('subscribe', () => {
    describe('basics', () => {
      let pubsub: FloodSub
      let registrar: StubbedInstance<Registrar>
      let components: FloodSubComponents

      beforeEach(async () => {
        const privateKey = await generateKeyPair('Ed25519')
        const peerId = peerIdFromPrivateKey(privateKey)
        registrar = stubInterface<Registrar>()
        components = {
          peerId,
          privateKey,
          registrar,
          logger: defaultLogger()
        }

        pubsub = floodsub()(components)

        await start(pubsub)
      })

      afterEach(async () => {
        await stop(pubsub)
      })

      it('should add subscription', () => {
        pubsub.subscribe(topic)

        expect(pubsub.getTopics()).to.have.lengthOf(1)
        expect(pubsub.getTopics()).to.include(topic)
      })
    })

    describe('two nodes', () => {
      let pubsubA: FloodSub
      let pubsubB: FloodSub
      let peerIdA: PeerId
      let peerIdB: PeerId
      let registrarA: StubbedInstance<Registrar>
      let registrarB: StubbedInstance<Registrar>

      beforeEach(async () => {
        const privateKeyA = await generateKeyPair('Ed25519')
        peerIdA = peerIdFromPrivateKey(privateKeyA)

        const privateKeyB = await generateKeyPair('Ed25519')
        peerIdB = peerIdFromPrivateKey(privateKeyB)

        registrarA = stubInterface<Registrar>()
        registrarB = stubInterface<Registrar>()

        pubsubA = floodsub()({
          peerId: peerIdA,
          privateKey: privateKeyA,
          registrar: registrarA,
          logger: defaultLogger()
        })
        pubsubB = floodsub()({
          peerId: peerIdB,
          privateKey: privateKeyB,
          registrar: registrarB,
          logger: defaultLogger()
        })

        // start pubsub and connect nodes
        await start(pubsubA, pubsubB)

        expect(registrarA.register.calledWith(pubsubA.protocols[0])).to.be.true()
        const topologyA = registrarA.register.getCall(0).args[1]

        expect(registrarB.handle.calledWith(pubsubA.protocols[0])).to.be.true()
        const handlerB = registrarB.handle.getCall(0).args[1]

        if (topologyA == null || handlerB == null) {
          throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
        }

        // Notify peers of connection
        const [c0, c1] = await connectionPair(peerIdA, peerIdB)

        topologyA.onConnect?.(peerIdB, c0)
        await handlerB(await c1.newStream(pubsubA.protocols[0]), c1)
      })

      afterEach(async () => {
        await stop(pubsubA, pubsubB)
      })

      it('should send subscribe message to connected peers', async () => {
        // @ts-expect-error private method
        const sendSpy = sinon.spy(pubsubA, 'send')
        // @ts-expect-error private method
        const processRpcSubOptSpy = sinon.spy(pubsubB, 'processRpcSubOpt')

        pubsubA.subscribe(topic)

        // Should send subscriptions to a peer
        expect(sendSpy.callCount).to.equal(1)

        // Other peer should receive subscription message
        await pWaitFor(() => {
          const subscribers = pubsubB.getSubscribers(topic)

          return subscribers.length === 1
        })

        expect(processRpcSubOptSpy.callCount).to.equal(1)
      })
    })
  })

  describe('unsubscribe', () => {
    describe('basics', () => {
      let pubsub: FloodSub

      beforeEach(async () => {
        const privateKey = await generateKeyPair('Ed25519')
        const peerId = peerIdFromPrivateKey(privateKey)

        pubsub = floodsub()({
          peerId,
          privateKey,
          registrar: stubInterface<Registrar>(),
          logger: defaultLogger()
        })

        await start(pubsub)
      })

      afterEach(async () => { await stop(pubsub) })

      it('should remove all subscriptions for a topic', () => {
        pubsub.subscribe(topic)
        pubsub.subscribe(topic)

        expect(pubsub.getTopics()).to.have.lengthOf(1)

        pubsub.unsubscribe(topic)

        expect(pubsub.getTopics()).to.have.lengthOf(0)
      })
    })

    describe('two nodes', () => {
      let pubsubA: FloodSub
      let pubsubB: FloodSub
      let peerIdA: PeerId
      let peerIdB: PeerId
      let registrarA: StubbedInstance<Registrar>
      let registrarB: StubbedInstance<Registrar>

      beforeEach(async () => {
        const privateKeyA = await generateKeyPair('Ed25519')
        peerIdA = peerIdFromPrivateKey(privateKeyA)

        const privateKeyB = await generateKeyPair('Ed25519')
        peerIdB = peerIdFromPrivateKey(privateKeyB)

        registrarA = stubInterface<Registrar>()
        registrarB = stubInterface<Registrar>()

        pubsubA = floodsub()({
          peerId: peerIdA,
          privateKey: privateKeyA,
          registrar: registrarA,
          logger: defaultLogger()
        })
        pubsubB = floodsub()({
          peerId: peerIdB,
          privateKey: privateKeyB,
          registrar: registrarB,
          logger: defaultLogger()
        })
      })

      // start pubsub and connect nodes
      beforeEach(async () => {
        await start(pubsubA, pubsubB)

        expect(registrarA.register.calledWith(pubsubA.protocols[0])).to.be.true()
        const topologyA = registrarA.register.getCall(0).args[1]

        expect(registrarB.handle.calledWith(pubsubA.protocols[0])).to.be.true()
        const handlerB = registrarB.handle.getCall(0).args[1]

        if (topologyA == null || handlerB == null) {
          throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
        }

        // Notify peers of connection
        const [c0, c1] = await connectionPair(peerIdA, peerIdB)

        topologyA.onConnect?.(peerIdB, c0)
        await handlerB(await c1.newStream(pubsubA.protocols[0]), c1)
      })

      afterEach(async () => {
        await stop(pubsubA, peerIdB)
      })

      it('should send unsubscribe message to connected peers', async () => {
        // @ts-expect-error private method
        const pubsubASendSpy = sinon.spy(pubsubA, 'send')
        // @ts-expect-error private method
        const pubsubBProcessRpcSubOptSpy = sinon.spy(pubsubB, 'processRpcSubOpt')

        pubsubA.subscribe(topic)
        // Should send subscriptions to a peer
        expect(pubsubASendSpy.callCount).to.eql(1)

        // Other peer should receive subscription message
        await pWaitFor(() => {
          const subscribers = pubsubB.getSubscribers(topic)

          return subscribers.length === 1
        })

        expect(pubsubBProcessRpcSubOptSpy.callCount).to.eql(1)

        // Unsubscribe
        pubsubA.unsubscribe(topic)

        // Should send subscriptions to a peer
        expect(pubsubASendSpy.callCount).to.eql(2)

        // Other peer should receive subscription message
        await pWaitFor(() => {
          const subscribers = pubsubB.getSubscribers(topic)

          return subscribers.length === 0
        })

        // @ts-expect-error .callCount is a property added by sinon
        expect(pubsubB.processRpcSubOpt.callCount).to.eql(2)
      })

      it('should not send unsubscribe message to connected peers if not subscribed', () => {
        // @ts-expect-error private method
        const pubsubASendSpy = sinon.spy(pubsubA, 'send')

        // Unsubscribe
        pubsubA.unsubscribe(topic)

        // Should send subscriptions to a peer
        expect(pubsubASendSpy.callCount).to.eql(0)
      })
    })
  })

  describe('getTopics', () => {
    let pubsub: FloodSub

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      pubsub = floodsub()({
        peerId,
        privateKey,
        registrar: stubInterface<Registrar>(),
        logger: defaultLogger()
      })
      await start(pubsub)
    })

    afterEach(async () => {
      await stop(pubsub)
    })

    it('returns the subscribed topics', () => {
      let subsTopics = pubsub.getTopics()
      expect(subsTopics).to.have.lengthOf(0)

      pubsub.subscribe(topic)

      subsTopics = pubsub.getTopics()
      expect(subsTopics).to.have.lengthOf(1)
      expect(subsTopics[0]).to.eql(topic)
    })
  })

  describe('getSubscribers', () => {
    let peerId: PeerId
    let pubsub: FloodSub

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      peerId = peerIdFromPrivateKey(privateKey)

      pubsub = floodsub()({
        peerId,
        privateKey,
        registrar: stubInterface<Registrar>(),
        logger: defaultLogger()
      })
    })

    afterEach(async () => { await stop(pubsub) })

    it('should fail if pubsub is not started', () => {
      const topic = 'test-topic'

      try {
        pubsub.getSubscribers(topic)
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.name).to.equal('NotStartedError')
        return
      }
      throw new Error('should fail if pubsub is not started')
    })

    it('should fail if no topic is provided', async () => {
      // start pubsub
      await start(pubsub)

      try {
        // @ts-expect-error invalid params
        pubsub.getSubscribers()
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.name).to.equal('InvalidParametersError')
        return
      }
      throw new Error('should fail if no topic is provided')
    })

    it('should get peer subscribed to one topic', async () => {
      const topic = 'test-topic'

      // start pubsub
      await start(pubsub)

      let peersSubscribed = pubsub.getSubscribers(topic)
      expect(peersSubscribed).to.be.empty()

      // Set mock peer subscribed
      const peer = new PeerStreams(peerId)
      const id = peer.peerId

      const set = new PeerSet()
      set.add(id)

      // @ts-expect-error private method
      pubsub['topics'].set(topic, set)
      // @ts-expect-error private method
      pubsub['peers'].set(peer.peerId, peer)

      peersSubscribed = pubsub.getSubscribers(topic)

      expect(peersSubscribed).to.not.be.empty()
      expect(id.equals(peersSubscribed[0])).to.be.true()
    })
  })

  describe('verification', () => {
    let pubsub: FloodSub
    const data = uint8ArrayFromString('bar')

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      pubsub = floodsub()({
        peerId,
        privateKey,
        registrar: stubInterface<Registrar>(),
        logger: defaultLogger()
      })
      await start(pubsub)
    })

    afterEach(async () => { await stop(pubsub) })

    it('should drop unsigned messages', async () => {
      // @ts-expect-error private method
      const publishSpy = sinon.spy(pubsub, 'publishMessage')
      // @ts-expect-error private method
      sinon.spy(pubsub, 'validate')

      const peerStream = new PeerStreams(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.peerId.toMultihash().bytes,
          data,
          sequenceNumber: await noSignMsgId(data),
          topic
        }]
      }

      pubsub.subscribe(topic)

      // @ts-expect-error private method
      await pubsub['processRpc'](peerStream, rpc)

      // message should not be delivered
      await delay(1000)

      expect(publishSpy).to.have.property('called', false)
    })

    it('should not drop unsigned messages if strict signing is disabled', async () => {
      pubsub.globalSignaturePolicy = 'StrictNoSign'

      // @ts-expect-error private method
      const publishSpy = sinon.spy(pubsub, 'publishMessage')
      // @ts-expect-error private method
      const validateSpy = sinon.spy(pubsub, 'validate')

      const peerStream = new PeerStreams(peerIdFromPrivateKey(await generateKeyPair('Ed25519')))
      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.peerId.toMultihash().bytes,
          data,
          topic
        }]
      }

      pubsub.subscribe(topic)

      const deferred = Promise.withResolvers<void>()

      pubsub.addEventListener('message', (evt) => {
        if (evt.detail.topic === topic) {
          deferred.resolve()
        }
      })

      // @ts-expect-error private method
      await pubsub['processRpc'](peerStream, rpc)

      // await message delivery
      await deferred.promise

      expect(validateSpy).to.have.property('callCount', 1)
      expect(publishSpy).to.have.property('callCount', 1)
    })
  })
})
