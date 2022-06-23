/* eslint max-nested-callbacks: ["error", 6] */
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import pWaitFor from 'p-wait-for'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PeerStreams } from '../src/peer-streams.js'
import {
  createPeerId,
  MockRegistrar,
  ConnectionPair,
  PubsubImplementation,
  mockIncomingStreamEvent
} from './utils/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { PeerSet } from '@libp2p/peer-collections'
import { Components } from '@libp2p/components'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { noSignMsgId } from '../src/utils.js'
import type { PubSubRPC } from '@libp2p/interface-pubsub'
import delay from 'delay'
import pDefer from 'p-defer'

const protocol = '/pubsub/1.0.0'
const topic = 'test-topic'
const message = uint8ArrayFromString('hello')

describe('pubsub base implementation', () => {
  describe('publish', () => {
    let pubsub: PubsubImplementation

    beforeEach(async () => {
      const peerId = await createPeerId()
      pubsub = new PubsubImplementation({
        multicodecs: [protocol],
        emitSelf: true
      })
      pubsub.init(new Components({
        peerId: peerId,
        registrar: new MockRegistrar()
      }))
    })

    afterEach(async () => await pubsub.stop())

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
      sinon.spy(pubsub, 'publishMessage')

      await pubsub.start()
      await pubsub.publish(topic, message)

      // event dispatch is async
      await pWaitFor(() => {
        // @ts-expect-error .callCount is a added by sinon
        return pubsub.publishMessage.callCount === 1
      })

      // Get the first message sent to _publish, and validate it
      // @ts-expect-error .getCall is a added by sinon
      const signedMessage: Message = pubsub.publishMessage.getCall(0).lastArg

      await expect(pubsub.validate(signedMessage)).to.eventually.be.undefined()
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
        const peerId = await createPeerId()
        pubsub = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsub.init(new Components({
          peerId: peerId,
          registrar: new MockRegistrar()
        }))
        await pubsub.start()
      })

      afterEach(async () => await pubsub.stop())

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
        peerIdA = await createPeerId()
        peerIdB = await createPeerId()

        registrarA = new MockRegistrar()
        registrarB = new MockRegistrar()

        pubsubA = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsubA.init(new Components({
          peerId: peerIdA,
          registrar: registrarA
        }))
        pubsubB = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsubB.init(new Components({
          peerId: peerIdB,
          registrar: registrarB
        }))
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
        const [c0, c1] = ConnectionPair()

        await topologyA.onConnect(peerIdB, c0)
        await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))
      })

      afterEach(async () => {
        await Promise.all([
          pubsubA.stop(),
          pubsubB.stop()
        ])
      })

      it('should send subscribe message to connected peers', async () => {
        sinon.spy(pubsubA, 'send')
        sinon.spy(pubsubB, 'processRpcSubOpt')

        pubsubA.subscribe(topic)

        // Should send subscriptions to a peer
        // @ts-expect-error .callCount is a added by sinon
        expect(pubsubA.send.callCount).to.eql(1)

        // Other peer should receive subscription message
        await pWaitFor(() => {
          const subscribers = pubsubB.getSubscribers(topic)

          return subscribers.length === 1
        })

        // @ts-expect-error .callCount is a added by sinon
        expect(pubsubB.processRpcSubOpt.callCount).to.eql(1)
      })
    })
  })

  describe('unsubscribe', () => {
    describe('basics', () => {
      let pubsub: PubsubImplementation

      beforeEach(async () => {
        const peerId = await createPeerId()
        pubsub = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsub.init(new Components({
          peerId: peerId,
          registrar: new MockRegistrar()
        }))
        await pubsub.start()
      })

      afterEach(async () => await pubsub.stop())

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
        peerIdA = await createPeerId()
        peerIdB = await createPeerId()

        registrarA = new MockRegistrar()
        registrarB = new MockRegistrar()

        pubsubA = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsubA.init(new Components({
          peerId: peerIdA,
          registrar: registrarA
        }))
        pubsubB = new PubsubImplementation({
          multicodecs: [protocol]
        })
        pubsubB.init(new Components({
          peerId: peerIdB,
          registrar: registrarB
        }))
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
        const [c0, c1] = ConnectionPair()

        await topologyA.onConnect(peerIdB, c0)
        await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))
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
    let peerId: PeerId
    let pubsub: PubsubImplementation

    beforeEach(async () => {
      peerId = await createPeerId()
      pubsub = new PubsubImplementation({
        multicodecs: [protocol]
      })
      pubsub.init(new Components({
        peerId: peerId,
        registrar: new MockRegistrar()
      }))
      await pubsub.start()
    })

    afterEach(async () => await pubsub.stop())

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
      peerId = await createPeerId()
      pubsub = new PubsubImplementation({
        multicodecs: [protocol]
      })
      pubsub.init(new Components({
        peerId: peerId,
        registrar: new MockRegistrar()
      }))
    })

    afterEach(async () => await pubsub.stop())

    it('should fail if pubsub is not started', () => {
      const topic = 'test-topic'

      try {
        pubsub.getSubscribers(topic)
      } catch (err: any) {
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
        // @ts-expect-error invalid params
        pubsub.getSubscribers()
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.code).to.eql('ERR_NOT_VALID_TOPIC')
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
      const peer = new PeerStreams({ id: peerId, protocol: 'a-protocol' })
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
    let peerId: PeerId
    let pubsub: PubsubImplementation
    const data = uint8ArrayFromString('bar')

    beforeEach(async () => {
      peerId = await createPeerId()
      pubsub = new PubsubImplementation({
        multicodecs: [protocol]
      })
      pubsub.init(new Components({
        peerId: peerId,
        registrar: new MockRegistrar()
      }))
      await pubsub.start()
    })

    afterEach(async () => await pubsub.stop())

    it('should drop unsigned messages', async () => {
      const publishSpy = sinon.spy(pubsub, 'publishMessage')
      sinon.spy(pubsub, 'validate')

      const peerStream = new PeerStreams({
        id: await createEd25519PeerId(),
        protocol: 'test'
      })
      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.id.toBytes(),
          data,
          sequenceNumber: await noSignMsgId(data),
          topic: topic
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
        id: await createEd25519PeerId(),
        protocol: 'test'
      })

      const rpc: PubSubRPC = {
        subscriptions: [],
        messages: [{
          from: peerStream.id.toBytes(),
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
