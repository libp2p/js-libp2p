import { floodsub } from '@libp2p/floodsub'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import pRetry from 'p-retry'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { connectPubsubNodes, createComponents } from './utils/create-pubsub.js'
import type { GossipSubAndComponents } from './utils/create-pubsub.js'
import type { SubscriptionChangeData, Message } from '../src/index.js'

describe.skip('gossipsub fallbacks to floodsub', () => {
  describe('basics', () => {
    let nodeGs: GossipSubAndComponents
    let nodeFs: GossipSubAndComponents

    beforeEach(async () => {
      nodeGs = await createComponents({
        init: {
          fallbackToFloodsub: true
        }
      })
      nodeFs = await createComponents({
        pubsub: floodsub as any
      })
    })

    afterEach(async () => {
      await stop(
        ...[nodeGs, nodeFs].reduce<any[]>(
          (acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)),
          []
        )
      )
    })

    it.skip('Dial event happened from nodeGs to nodeFs', async () => {
      await connectPubsubNodes(nodeGs, nodeFs)

      await pRetry(() => {
        // eslint-disable-next-line max-nested-callbacks
        expect(nodeGs.pubsub.getPeers().map((s) => s.toString())).to.include(nodeFs.components.peerId.toString())
        // eslint-disable-next-line max-nested-callbacks
        expect(nodeFs.pubsub.getPeers().map((s) => s.toString())).to.include(nodeGs.components.peerId.toString())
      })
    })
  })

  describe.skip('should not be added if fallback disabled', () => {
    let nodeGs: GossipSubAndComponents
    let nodeFs: GossipSubAndComponents

    beforeEach(async () => {
      nodeGs = await createComponents({
        init: {
          fallbackToFloodsub: false
        }
      })
      nodeFs = await createComponents({
        pubsub: floodsub as any
      })
    })

    afterEach(async () => {
      await stop(
        ...[nodeGs, nodeFs].reduce<any[]>(
          (acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)),
          []
        )
      )
    })

    it('Dial event happened from nodeGs to nodeFs, but nodeGs does not support floodsub', async () => {
      try {
        await connectPubsubNodes(nodeGs, nodeFs)
        expect.fail('Dial should not have succeed')
      } catch (err) {
        expect(err).to.have.property('name', 'UnsupportedProtocolError')
      }
    })
  })

  describe('subscription functionality', () => {
    let nodeGs: GossipSubAndComponents
    let nodeFs: GossipSubAndComponents

    before(async () => {
      nodeGs = await createComponents({
        init: {
          fallbackToFloodsub: true
        },
        logPrefix: 'gossipsub-peer'
      })
      nodeFs = await createComponents({
        pubsub: floodsub as any,
        logPrefix: 'floodsub-peer'
      })

      await connectPubsubNodes(nodeGs, nodeFs)
    })

    afterEach(async () => {
      await stop(
        ...[nodeGs, nodeFs].reduce<any[]>((acc, curr) => {
          acc.push(curr.pubsub, ...Object.entries(curr.components))

          return acc
        }, [])
      )
    })

    it('Subscribe to a topic', async function () {
      this.timeout(10000)
      const topic = 'Z'
      nodeGs.pubsub.subscribe(topic)
      nodeFs.pubsub.subscribe(topic)

      // await subscription change
      const [evt] = await Promise.all([
        pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(nodeGs.pubsub, 'subscription-change'),
        pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(nodeFs.pubsub, 'subscription-change')
      ])
      const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail

      expect(nodeGs.pubsub.getTopics()).to.include(topic)
      expect(nodeFs.pubsub.getTopics()).to.include(topic)
      expect(nodeGs.pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodeFs.pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodeGs.pubsub.getSubscribers(topic).map((p) => p.toString())).to.include(
        nodeFs.components.peerId.toString()
      )
      expect(nodeFs.pubsub.getSubscribers(topic).map((p) => p.toString())).to.include(
        nodeGs.components.peerId.toString()
      )

      expect(nodeGs.pubsub.getPeers().map((p) => p.toString())).to.include(changedPeerId.toString())
      expect(changedSubs).to.have.lengthOf(1)
      expect(changedSubs[0].topic).to.equal(topic)
      expect(changedSubs[0].subscribe).to.equal(true)
    })
  })

  describe('publish functionality', () => {
    let nodeGs: GossipSubAndComponents
    let nodeFs: GossipSubAndComponents
    const topic = 'Z'

    beforeEach(async () => {
      nodeGs = await createComponents({
        init: {
          fallbackToFloodsub: true
        }
      })
      nodeFs = await createComponents({
        pubsub: floodsub as any
      })

      await connectPubsubNodes(nodeGs, nodeFs)

      nodeGs.pubsub.subscribe(topic)
      nodeFs.pubsub.subscribe(topic)

      // await subscription change
      await Promise.all([pEvent(nodeGs.pubsub, 'subscription-change'), pEvent(nodeFs.pubsub, 'subscription-change')])
    })

    afterEach(async () => {
      await stop(
        ...[nodeGs, nodeFs].reduce<any[]>(
          (acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)),
          []
        )
      )
    })

    const batchPublishOpts = [true, false]
    for (const batchPublish of batchPublishOpts) {
      // eslint-disable-next-line no-loop-func
      it(`Publish to a topic - nodeGs - batchPublish: ${batchPublish}`, async () => {
        const promise = pEvent<'message', CustomEvent<Message>>(nodeFs.pubsub, 'message')
        const data = uint8ArrayFromString('hey')

        await nodeGs.pubsub.publish(topic, data, { batchPublish })

        const evt = await promise
        if (evt.detail.type !== 'signed') {
          throw new Error('unexpected message type')
        }
        expect(evt.detail.data).to.equalBytes(data)
        expect(evt.detail.from.toString()).to.be.eql(nodeGs.components.peerId.toString())
      })

      // eslint-disable-next-line no-loop-func
      it(`Publish to a topic - nodeFs - batchPublish: ${batchPublish}`, async () => {
        const promise = pEvent<'message', CustomEvent<Message>>(nodeGs.pubsub, 'message')
        const data = uint8ArrayFromString('banana')

        await nodeFs.pubsub.publish(topic, data, { batchPublish })

        const evt = await promise
        if (evt.detail.type !== 'signed') {
          throw new Error('unexpected message type')
        }
        expect(evt.detail.data).to.equalBytes(data)
        expect(evt.detail.from.toString()).to.be.eql(nodeFs.components.peerId.toString())
      })
    }
  })

  describe('publish after unsubscribe', () => {
    let nodeGs: GossipSubAndComponents
    let nodeFs: GossipSubAndComponents
    const topic = 'Z'

    beforeEach(async () => {
      nodeGs = await createComponents({
        init: {
          fallbackToFloodsub: true
        }
      })
      nodeFs = await createComponents({
        pubsub: floodsub as any
      })

      await connectPubsubNodes(nodeGs, nodeFs)

      nodeGs.pubsub.subscribe(topic)
      nodeFs.pubsub.subscribe(topic)

      // await subscription change
      await Promise.all([pEvent(nodeGs.pubsub, 'subscription-change'), pEvent(nodeFs.pubsub, 'subscription-change')])
      // allow subscriptions to propagate to the other peer
      await delay(10)
    })

    afterEach(async () => {
      await stop(
        ...[nodeGs, nodeFs].reduce<any[]>(
          (acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)),
          []
        )
      )
    })

    it('Unsubscribe from a topic', async () => {
      const promise = pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(
        nodeFs.pubsub,
        'subscription-change'
      )

      nodeGs.pubsub.unsubscribe(topic)
      expect(nodeGs.pubsub.getTopics()).to.be.empty()

      const evt = await promise
      const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail

      expect(nodeFs.pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodeFs.pubsub.getSubscribers(topic)).to.be.empty()
      expect(nodeFs.pubsub.getPeers().map((p) => p.toString())).to.include(changedPeerId.toString())
      expect(changedSubs).to.have.lengthOf(1)
      expect(changedSubs[0].topic).to.equal(topic)
      expect(changedSubs[0].subscribe).to.equal(false)
    })

    it('Publish to a topic after unsubscribe', async () => {
      nodeGs.pubsub.unsubscribe(topic)
      await pEvent(nodeFs.pubsub, 'subscription-change')

      const promise = new Promise<void>((resolve, reject) => {
        nodeGs.pubsub.addEventListener('message', reject, {
          once: true
        })
        setTimeout(() => {
          nodeGs.pubsub.removeEventListener('message', reject)
          resolve()
        }, 100)
      })

      await nodeFs.pubsub.publish(topic, uint8ArrayFromString('banana'))
      await nodeGs.pubsub.publish(topic, uint8ArrayFromString('banana'))

      try {
        await promise
      } catch (e) {
        expect.fail('message should not be received')
      }
    })
  })
})
