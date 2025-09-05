/* eslint max-nested-callbacks: ["error", 6] */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PeerStreams } from '../src/peer-streams.js'
import { noSignMsgId } from '../src/utils.js'
import {
  MockRegistrar,
  connectionPair,
  PubsubImplementation
} from './utils/index.js'
import type { PeerId, Message, PubSubRPC } from '@libp2p/interface'

const protocol = '/pubsub/1.0.0'
const topic = 'test-topic'
const message = uint8ArrayFromString('hello')

describe('pubsub base implementation', () => {
  describe('publish', () => {
    let pubsub: PubsubImplementation

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      pubsub = new PubsubImplementation({
        peerId,
        privateKey,
        registrar: new MockRegistrar(),
        logger: defaultLogger()
      }, {
        multicodecs: [protocol],
        emitSelf: true
      })
    })

    afterEach(async () => { await pubsub.stop() })

    it('calls _publish for router to forward messages', async () => {
      sinon.spy(pubsub, 'publishMessage')

      await pubsub.start()
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
      const publishMessageSpy = sinon.spy(pubsub, 'publishMessage')

      await pubsub.start()
      await pubsub.publish(topic, message)

      // event dispatch is async
      await pWaitFor(() => {
        return publishMessageSpy.callCount === 1
      })

      // Get the first message sent to _publish, and validate it
      const signedMessage: Message = publishMessageSpy.getCall(0).lastArg

      await expect(pubsub.validate(pubsub.components.peerId, signedMessage)).to.eventually.be.undefined()
    })

    it('calls publishes messages twice', async () => {
      let count = 0

      await pubsub.start()
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
      let pubsub: PubsubImplementation

      beforeEach(async () => {
        const privateKey = await generateKeyPair('Ed25519')
        const peerId = peerIdFromPrivateKey(privateKey)

        pubsub = new PubsubImplementation({
          peerId,
          privateKey,
          registrar: new MockRegistrar(),
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })
        await pubsub.start()
      })

      afterEach(async () => { await pubsub.stop() })

      it('should add subscription', () => {
        pubsub.subscribe(topic)

        expect(pubsub.subscriptions.size).to.eql(1)
        expect(pubsub.subscriptions.has(topic)).to.be.true()
      })
    })

    describe('two nodes', () => {
      let pubsubA: PubsubImplementation, pubsubB: PubsubImplementation
      let peerIdA: PeerId, peerIdB: PeerId
      let registrarA: MockRegistrar
      let registrarB: MockRegistrar

      beforeEach(async () => {
        const privateKeyA = await generateKeyPair('Ed25519')
        peerIdA = peerIdFromPrivateKey(privateKeyA)

        const privateKeyB = await generateKeyPair('Ed25519')
        peerIdB = peerIdFromPrivateKey(privateKeyB)

        registrarA = new MockRegistrar()
        registrarB = new MockRegistrar()

        pubsubA = new PubsubImplementation({
          peerId: peerIdA,
          privateKey: privateKeyA,
          registrar: registrarA,
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })
        pubsubB = new PubsubImplementation({
          peerId: peerIdB,
          privateKey: privateKeyB,
          registrar: registrarB,
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })

        // start pubsub and connect nodes
        await start(pubsubA, pubsubB)

        const topologyA = registrarA.getTopologies(protocol)[0]
        const handlerB = registrarB.getHandler(protocol)

        if (topologyA == null || handlerB == null) {
          throw new Error(`No handler registered for ${protocol}`)
        }

        // Notify peers of connection
        const [c0, c1] = await connectionPair(peerIdA, peerIdB)

        topologyA.onConnect?.(peerIdB, c0)
        await handlerB.handler(await c1.newStream(protocol), c1)
      })

      afterEach(async () => {
        await stop(pubsubA, pubsubB)
      })

      it('should send subscribe message to connected peers', async () => {
        sinon.spy(pubsubA, 'send')
        sinon.spy(pubsubB, 'processRpcSubOpt')

        pubsubA.subscribe(topic)

        // Should send subscriptions to a peer
        // @ts-expect-error .callCount is a added by sinon
        expect(pubsubA.send.callCount).to.equal(1)

        // Other peer should receive subscription message
        await pWaitFor(() => {
          const subscribers = pubsubB.getSubscribers(topic)

          return subscribers.length === 1
        })

        // @ts-expect-error .callCount is a added by sinon
        expect(pubsubB.processRpcSubOpt.callCount).to.equal(1)
      })
    })
  })

  describe('unsubscribe', () => {
    describe('basics', () => {
      let pubsub: PubsubImplementation

      beforeEach(async () => {
        const privateKey = await generateKeyPair('Ed25519')
        const peerId = peerIdFromPrivateKey(privateKey)

        pubsub = new PubsubImplementation({
          peerId,
          privateKey,
          registrar: new MockRegistrar(),
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })
        await pubsub.start()
      })

      afterEach(async () => { await pubsub.stop() })

      it('should remove all subscriptions for a topic', () => {
        pubsub.subscribe(topic)
        pubsub.subscribe(topic)

        expect(pubsub.subscriptions.size).to.eql(1)

        pubsub.unsubscribe(topic)

        expect(pubsub.subscriptions.size).to.eql(0)
      })
    })

    describe('two nodes', () => {
      let pubsubA: PubsubImplementation, pubsubB: PubsubImplementation
      let peerIdA: PeerId, peerIdB: PeerId
      let registrarA: MockRegistrar
      let registrarB: MockRegistrar

      beforeEach(async () => {
        const privateKeyA = await generateKeyPair('Ed25519')
        peerIdA = peerIdFromPrivateKey(privateKeyA)

        const privateKeyB = await generateKeyPair('Ed25519')
        peerIdB = peerIdFromPrivateKey(privateKeyB)

        registrarA = new MockRegistrar()
        registrarB = new MockRegistrar()

        pubsubA = new PubsubImplementation({
          peerId: peerIdA,
          privateKey: privateKeyA,
          registrar: registrarA,
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })
        pubsubB = new PubsubImplementation({
          peerId: peerIdB,
          privateKey: privateKeyB,
          registrar: registrarB,
          logger: defaultLogger()
        }, {
          multicodecs: [protocol]
        })
      })

      // start pubsub and connect nodes
      beforeEach(async () => {
        await Promise.all([
          pubsubA.start(),
          pubsubB.start()
        ])

        const topologyA = registrarA.getTopologies(protocol)[0]
        const handlerB = registrarB.getHandler(protocol)

        if (topologyA == null || handlerB == null) {
          throw new Error(`No handler registered for ${protocol}`)
        }

        // Notify peers of connection
        const [c0, c1] = await connectionPair(peerIdA, peerIdB)

        topologyA.onConnect?.(peerIdB, c0)
        await handlerB.handler(await c1.newStream(protocol), c1)
      })

      afterEach(async () => {
        await Promise.all([
          pubsubA.stop(),
          pubsubB.stop()
        ])
      })

      it('should send unsubscribe message to connected peers', async () => {
        const pubsubASendSpy = sinon.spy(pubsubA, 'send')
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
        const pubsubASendSpy = sinon.spy(pubsubA, 'send')

        // Unsubscribe
        pubsubA.unsubscribe(topic)

        // Should send subscriptions to a peer
        expect(pubsubASendSpy.callCount).to.eql(0)
      })
    })
  })

  describe('getTopics', () => {
    let pubsub: PubsubImplementation

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      pubsub = new PubsubImplementation({
        peerId,
        privateKey,
        registrar: new MockRegistrar(),
        logger: defaultLogger()
      }, {
        multicodecs: [protocol]
      })
      await pubsub.start()
    })

    afterEach(async () => { await pubsub.stop() })

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
    let pubsub: PubsubImplementation

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      peerId = peerIdFromPrivateKey(privateKey)

      pubsub = new PubsubImplementation({
        peerId,
        privateKey,
        registrar: new MockRegistrar(),
        logger: defaultLogger()
      }, {
        multicodecs: [protocol]
      })
    })

    afterEach(async () => { await pubsub.stop() })

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
      await pubsub.start()

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
      await pubsub.start()

      let peersSubscribed = pubsub.getSubscribers(topic)
      expect(peersSubscribed).to.be.empty()

      // Set mock peer subscribed
      const peer = new PeerStreams({
        logger: defaultLogger()
      }, { id: peerId, protocol: 'a-protocol' })
      const id = peer.id

      const set = new PeerSet()
      set.add(id)

      pubsub.topics.set(topic, set)
      pubsub.peers.set(peer.id, peer)

      peersSubscribed = pubsub.getSubscribers(topic)

      expect(peersSubscribed).to.not.be.empty()
      expect(id.equals(peersSubscribed[0])).to.be.true()
    })
  })

  describe('verification', () => {
    let pubsub: PubsubImplementation
    const data = uint8ArrayFromString('bar')

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      pubsub = new PubsubImplementation({
        peerId,
        privateKey,
        registrar: new MockRegistrar(),
        logger: defaultLogger()
      }, {
        multicodecs: [protocol]
      })
      await pubsub.start()
    })

    afterEach(async () => { await pubsub.stop() })

    it('should drop unsigned messages', async () => {
      const publishSpy = sinon.spy(pubsub, 'publishMessage')
      sinon.spy(pubsub, 'validate')

      const peerStream = new PeerStreams({
        logger: defaultLogger()
      }, {
        id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        protocol: 'test'
      })
      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.id.toMultihash().bytes,
          data,
          sequenceNumber: await noSignMsgId(data),
          topic
        }]
      }

      pubsub.subscribe(topic)

      await pubsub.processRpc(peerStream.id, peerStream, rpc)

      // message should not be delivered
      await delay(1000)

      expect(publishSpy).to.have.property('called', false)
    })

    it('should not drop unsigned messages if strict signing is disabled', async () => {
      pubsub.globalSignaturePolicy = 'StrictNoSign'

      const publishSpy = sinon.spy(pubsub, 'publishMessage')
      sinon.spy(pubsub, 'validate')

      const peerStream = new PeerStreams({
        logger: defaultLogger()
      }, {
        id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        protocol: 'test'
      })

      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.id.toMultihash().bytes,
          data,
          topic
        }]
      }

      pubsub.subscribe(topic)

      const deferred = pDefer()

      pubsub.addEventListener('message', (evt) => {
        if (evt.detail.topic === topic) {
          deferred.resolve()
        }
      })

      await pubsub.processRpc(peerStream.id, peerStream, rpc)

      // await message delivery
      await deferred.promise

      expect(pubsub.validate).to.have.property('callCount', 1)
      expect(publishSpy).to.have.property('callCount', 1)
    })
  })
})
