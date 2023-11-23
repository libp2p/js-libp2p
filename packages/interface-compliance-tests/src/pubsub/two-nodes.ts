/* eslint max-nested-callbacks: ["error", 6] */
import { TopicValidatorResult } from '@libp2p/interface/pubsub'
import { start, stop } from '@libp2p/interface/startable'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { mockNetwork } from '../mocks/index.js'
import { createComponents, waitForSubscriptionUpdate } from './utils.js'
import type { PubSubArgs, PubSubComponents } from './index.js'
import type { TestSetup } from '../index.js'
import type { Message, PubSub } from '@libp2p/interface/pubsub'

const topic = 'foo'

function shouldNotHappen (): void {
  expect.fail()
}

export default (common: TestSetup<PubSub, PubSubArgs>): void => {
  describe('pubsub with two nodes', () => {
    let psA: PubSub
    let psB: PubSub
    let componentsA: PubSubComponents
    let componentsB: PubSubComponents

    // Create pubsub nodes and connect them
    beforeEach(async () => {
      mockNetwork.reset()

      componentsA = await createComponents()
      componentsB = await createComponents()

      psA = componentsA.pubsub = await common.setup({
        components: componentsA,
        init: {
          emitSelf: true
        }
      })
      psB = componentsB.pubsub = await common.setup({
        components: componentsB,
        init: {
          emitSelf: false
        }
      })

      // Start pubsub and connect nodes
      await start(...Object.values(componentsA), ...Object.values(componentsB))

      expect(psA.getPeers()).to.be.empty()
      expect(psB.getPeers()).to.be.empty()

      await componentsA.connectionManager.openConnection(componentsB.peerId)

      // Wait for peers to be ready in pubsub
      await pWaitFor(() => psA.getPeers().length === 1 && psB.getPeers().length === 1)
    })

    afterEach(async () => {
      sinon.restore()
      await stop(...Object.values(componentsA), ...Object.values(componentsB))
      await common.teardown()
      mockNetwork.reset()
    })

    it('Subscribe to a topic in nodeA', async () => {
      const defer = pDefer()

      psB.addEventListener('subscription-change', (evt) => {
        const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail
        expect(psA.getTopics()).to.deep.equal([topic])
        expect(psB.getPeers()).to.have.lengthOf(1)
        expect(psB.getSubscribers(topic).map(p => p.toString())).to.deep.equal([componentsA.peerId.toString()])
        expect(changedPeerId.toString()).to.equal(psB.getPeers()[0].toString())
        expect(changedSubs).to.have.lengthOf(1)
        expect(changedSubs[0].topic).to.equal(topic)
        expect(changedSubs[0].subscribe).to.equal(true)
        defer.resolve()
      }, {
        once: true
      })
      psA.subscribe(topic)

      return defer.promise
    })

    it('Publish to a topic in nodeA', async () => {
      const defer = pDefer()

      psA.addEventListener('message', (evt) => {
        if (evt.detail.topic === topic) {
          const msg = evt.detail
          expect(uint8ArrayToString(msg.data)).to.equal('hey')
          psB.removeEventListener('message', shouldNotHappen)
          defer.resolve()
        }
      }, {
        once: true
      })

      psA.subscribe(topic)
      psB.subscribe(topic)

      await Promise.all([
        waitForSubscriptionUpdate(psA, componentsB.peerId),
        waitForSubscriptionUpdate(psB, componentsA.peerId)
      ])

      await psA.publish(topic, uint8ArrayFromString('hey'))

      return defer.promise
    })

    it('Publish to a topic in nodeB', async () => {
      const defer = pDefer()

      psA.addEventListener('message', (evt) => {
        if (evt.detail.topic !== topic) {
          return
        }

        const msg = evt.detail
        psA.addEventListener('message', (evt) => {
          if (evt.detail.topic === topic) {
            shouldNotHappen()
          }
        }, {
          once: true
        })
        expect(uint8ArrayToString(msg.data)).to.equal('banana')

        setTimeout(() => {
          psA.removeEventListener('message')
          psB.removeEventListener('message')

          defer.resolve()
        }, 100)
      }, {
        once: true
      })

      psB.addEventListener('message', shouldNotHappen)

      psA.subscribe(topic)
      psB.subscribe(topic)

      await Promise.all([
        waitForSubscriptionUpdate(psA, componentsB.peerId),
        waitForSubscriptionUpdate(psB, componentsA.peerId)
      ])

      await psB.publish(topic, uint8ArrayFromString('banana'))

      return defer.promise
    })

    it('validate topic message', async () => {
      const defer = pDefer()

      psA.subscribe(topic)

      psB.topicValidators.set(topic, (peer, message) => {
        if (!peer.equals(componentsA.peerId)) {
          defer.reject(new Error('Invalid peer id in topic validator fn'))
          return TopicValidatorResult.Reject
        }

        if (uint8ArrayToString(message.data) !== 'hey') {
          defer.reject(new Error('Invalid message in topic validator fn'))
          return TopicValidatorResult.Reject
        }

        defer.resolve()
        return TopicValidatorResult.Accept
      })
      psB.subscribe(topic)

      await Promise.all([
        waitForSubscriptionUpdate(psA, componentsB.peerId),
        waitForSubscriptionUpdate(psB, componentsA.peerId)
      ])

      await psA.publish(topic, uint8ArrayFromString('hey'))

      return defer.promise
    })

    it('Publish 10 msg to a topic in nodeB', async () => {
      const defer = pDefer()
      let counter = 0

      psB.addEventListener('message', shouldNotHappen)
      psA.addEventListener('message', receivedMsg)

      function receivedMsg (evt: CustomEvent<Message>): void {
        const msg = evt.detail
        if (msg.type === 'unsigned') {
          expect(uint8ArrayToString(msg.data)).to.equal('banana')
          expect(msg.topic).to.be.equal(topic)
        } else {
          expect(uint8ArrayToString(msg.data)).to.equal('banana')
          expect(msg.from.toString()).to.equal(componentsB.peerId.toString())
          expect(msg.sequenceNumber).to.be.a('BigInt')
          expect(msg.topic).to.be.equal(topic)
        }

        if (++counter === 10) {
          psA.removeEventListener('message', receivedMsg)
          psB.removeEventListener('message', shouldNotHappen)

          defer.resolve()
        }
      }

      psA.subscribe(topic)
      psB.subscribe(topic)

      await Promise.all([
        waitForSubscriptionUpdate(psA, componentsB.peerId),
        waitForSubscriptionUpdate(psB, componentsA.peerId)
      ])

      await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          await psB.publish(topic, uint8ArrayFromString('banana'))
        })
      )

      return defer.promise
    })

    it('Unsubscribe from topic in nodeA', async () => {
      const defer = pDefer()
      let callCount = 0

      psB.addEventListener('subscription-change', (evt) => {
        callCount++

        if (callCount === 1) {
          // notice subscribe
          const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail
          expect(psB.getPeers()).to.have.lengthOf(1)
          expect(psB.getTopics()).to.be.empty()
          expect(changedPeerId.toString()).to.equal(psB.getPeers()[0].toString())
          expect(changedSubs).to.have.lengthOf(1)
          expect(changedSubs[0].topic).to.equal(topic)
          expect(changedSubs[0].subscribe).to.equal(true)
        } else {
          // notice unsubscribe
          const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail
          expect(psB.getPeers()).to.have.lengthOf(1)
          expect(psB.getTopics()).to.be.empty()
          expect(changedPeerId.toString()).to.equal(psB.getPeers()[0].toString())
          expect(changedSubs).to.have.lengthOf(1)
          expect(changedSubs[0].topic).to.equal(topic)
          expect(changedSubs[0].subscribe).to.equal(false)

          defer.resolve()
        }
      })

      psA.subscribe(topic)
      expect(psA.getTopics()).to.not.be.empty()

      psA.unsubscribe(topic)
      expect(psA.getTopics()).to.be.empty()

      return defer.promise
    })
  })
}
