import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { GossipSub } from '../src/index.js'
import type { Message, SubscriptionChangeData } from '@libp2p/interface/pubsub'
import { pEvent } from 'p-event'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import defer from 'p-defer'
import pWaitFor from 'p-wait-for'
import {
  connectAllPubSubNodes,
  connectPubsubNodes,
  createComponentsArray,
  type GossipSubAndComponents
} from './utils/create-pubsub.js'
import { stop } from '@libp2p/interface/startable'
import { mockNetwork } from '@libp2p/interface-compliance-tests/mocks'

const shouldNotHappen = () => expect.fail()

async function nodesArePubSubPeers(node0: GossipSubAndComponents, node1: GossipSubAndComponents, timeout = 60000) {
  await pWaitFor(
    () => {
      const node0SeesNode1 = node0.pubsub
        .getPeers()
        .map((p) => p.toString())
        .includes(node1.components.peerId.toString())
      const node1SeesNode0 = node1.pubsub
        .getPeers()
        .map((p) => p.toString())
        .includes(node0.components.peerId.toString())
      return node0SeesNode1 && node1SeesNode0
    },
    {
      timeout
    }
  )
}

describe('2 nodes', () => {
  describe('Pubsub dial', () => {
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({ number: 2 })
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('Dial from nodeA to nodeB happened with FloodsubID', async () => {
      await connectPubsubNodes(nodes[0], nodes[1])
      await nodesArePubSubPeers(nodes[0], nodes[1])
    })
  })

  describe('basics', () => {
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({ number: 2 })
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('Dial from nodeA to nodeB happened with GossipsubIDv11', async () => {
      await connectPubsubNodes(nodes[0], nodes[1])
      await nodesArePubSubPeers(nodes[0], nodes[1])
    })
  })

  describe('subscription functionality', () => {
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: 2,
        connected: true
      })
      await nodesArePubSubPeers(nodes[0], nodes[1])
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('Subscribe to a topic', async () => {
      const topic = 'test_topic'

      nodes[0].pubsub.subscribe(topic)
      nodes[1].pubsub.subscribe(topic)

      // await subscription change
      const [evt0] = await Promise.all([
        pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(nodes[0].pubsub, 'subscription-change'),
        pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(nodes[1].pubsub, 'subscription-change')
      ])

      const { peerId: changedPeerId, subscriptions: changedSubs } = evt0.detail

      expect(nodes[0].pubsub.getTopics()).to.include(topic)
      expect(nodes[1].pubsub.getTopics()).to.include(topic)
      expect(nodes[0].pubsub.getSubscribers(topic).map((p) => p.toString())).to.include(
        nodes[1].components.peerId.toString()
      )
      expect(nodes[1].pubsub.getSubscribers(topic).map((p) => p.toString())).to.include(
        nodes[0].components.peerId.toString()
      )

      expect(changedPeerId.toString()).to.equal(nodes[1].components.peerId.toString())
      expect(changedSubs).to.have.lengthOf(1)
      expect(changedSubs[0].topic).to.equal(topic)
      expect(changedSubs[0].subscribe).to.equal(true)

      // await heartbeats
      await Promise.all([
        pEvent(nodes[0].pubsub, 'gossipsub:heartbeat'),
        pEvent(nodes[1].pubsub, 'gossipsub:heartbeat')
      ])

      expect((nodes[0].pubsub as GossipSub).mesh.get(topic)?.has(nodes[1].components.peerId.toString())).to.be.true()
      expect((nodes[1].pubsub as GossipSub).mesh.get(topic)?.has(nodes[0].components.peerId.toString())).to.be.true()
    })
  })

  describe('publish functionality', () => {
    const topic = 'Z'
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: 2,
        connected: true
      })

      // Create subscriptions
      nodes[0].pubsub.subscribe(topic)
      nodes[1].pubsub.subscribe(topic)

      // await subscription change and heartbeat
      await Promise.all([
        pEvent(nodes[0].pubsub, 'subscription-change'),
        pEvent(nodes[1].pubsub, 'subscription-change'),
        pEvent(nodes[0].pubsub, 'gossipsub:heartbeat'),
        pEvent(nodes[1].pubsub, 'gossipsub:heartbeat')
      ])
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('Publish to a topic - nodeA', async () => {
      const promise = pEvent<'message', CustomEvent<Message>>(nodes[1].pubsub, 'message')
      nodes[0].pubsub.addEventListener('message', shouldNotHappen)
      const data = uint8ArrayFromString('hey')

      await nodes[0].pubsub.publish(topic, data)

      const evt = await promise

      if (evt.detail.type !== 'signed') {
        throw new Error('unexpected msg type')
      }
      expect(evt.detail.data).to.equalBytes(data)
      expect(evt.detail.from.toString()).to.equal(nodes[0].components.peerId.toString())

      nodes[0].pubsub.removeEventListener('message', shouldNotHappen)
    })

    it('Publish to a topic - nodeB', async () => {
      const promise = pEvent<'message', CustomEvent<Message>>(nodes[0].pubsub, 'message')
      nodes[1].pubsub.addEventListener('message', shouldNotHappen)
      const data = uint8ArrayFromString('banana')

      await nodes[1].pubsub.publish(topic, data)

      const evt = await promise

      if (evt.detail.type !== 'signed') {
        throw new Error('unexpected msg type')
      }
      expect(evt.detail.data).to.equalBytes(data)
      expect(evt.detail.from.toString()).to.equal(nodes[1].components.peerId.toString())

      nodes[1].pubsub.removeEventListener('message', shouldNotHappen)
    })

    it('Publish 10 msg to a topic', async () => {
      let counter = 0

      nodes[1].pubsub.addEventListener('message', shouldNotHappen)
      nodes[0].pubsub.addEventListener('message', receivedMsg)

      const done = defer()

      function receivedMsg(evt: CustomEvent<Message>) {
        const msg = evt.detail

        expect(uint8ArrayToString(msg.data)).to.startWith('banana')

        if (msg.type !== 'signed') {
          throw new Error('unexpected msg type')
        }
        expect(msg.from.toString()).to.equal(nodes[1].components.peerId.toString())
        expect(msg.sequenceNumber).to.be.a('BigInt')
        expect(msg.topic).to.equal(topic)

        if (++counter === 10) {
          nodes[0].pubsub.removeEventListener('message', receivedMsg)
          nodes[1].pubsub.removeEventListener('message', shouldNotHappen)
          done.resolve()
        }
      }

      await Promise.all(
        Array.from({ length: 10 }).map(async (_, i) => {
          await nodes[1].pubsub.publish(topic, uint8ArrayFromString(`banana${i}`))
        })
      )

      await done.promise
    })
  })

  describe('publish after unsubscribe', () => {
    const topic = 'Z'
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({ number: 2, init: { allowPublishToZeroPeers: true } })
      await connectAllPubSubNodes(nodes)

      // Create subscriptions
      nodes[0].pubsub.subscribe(topic)
      nodes[1].pubsub.subscribe(topic)

      // await subscription change and heartbeat
      await Promise.all([
        pEvent(nodes[0].pubsub, 'subscription-change'),
        pEvent(nodes[1].pubsub, 'subscription-change')
      ])
      await Promise.all([
        pEvent(nodes[0].pubsub, 'gossipsub:heartbeat'),
        pEvent(nodes[1].pubsub, 'gossipsub:heartbeat')
      ])
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('Unsubscribe from a topic', async () => {
      nodes[0].pubsub.unsubscribe(topic)
      expect(nodes[0].pubsub.getTopics()).to.be.empty()

      const evt = await pEvent<'subscription-change', CustomEvent<SubscriptionChangeData>>(
        nodes[1].pubsub,
        'subscription-change'
      )
      const { peerId: changedPeerId, subscriptions: changedSubs } = evt.detail

      await pEvent(nodes[1].pubsub, 'gossipsub:heartbeat')

      expect(nodes[1].pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodes[1].pubsub.getSubscribers(topic)).to.be.empty()

      expect(changedPeerId.toString()).to.equal(nodes[0].components.peerId.toString())
      expect(changedSubs).to.have.lengthOf(1)
      expect(changedSubs[0].topic).to.equal(topic)
      expect(changedSubs[0].subscribe).to.equal(false)
    })

    it('Publish to a topic after unsubscribe', async () => {
      const promises = [pEvent(nodes[1].pubsub, 'subscription-change'), pEvent(nodes[1].pubsub, 'gossipsub:heartbeat')]

      nodes[0].pubsub.unsubscribe(topic)

      await Promise.all(promises)

      const promise = new Promise<void>((resolve, reject) => {
        nodes[0].pubsub.addEventListener('message', reject)

        setTimeout(() => {
          nodes[0].pubsub.removeEventListener('message', reject)
          resolve()
        }, 100)
      })

      await nodes[1].pubsub.publish('Z', uint8ArrayFromString('banana'))
      await nodes[0].pubsub.publish('Z', uint8ArrayFromString('banana'))

      try {
        await promise
      } catch (e) {
        expect.fail('message should not be received')
      }
    })
  })

  describe('nodes send state on connection', () => {
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: 2
      })

      // Make subscriptions prior to new nodes
      nodes[0].pubsub.subscribe('Za')
      nodes[1].pubsub.subscribe('Zb')

      expect(nodes[0].pubsub.getPeers()).to.be.empty()
      expect(nodes[0].pubsub.getTopics()).to.include('Za')
      expect(nodes[1].pubsub.getPeers()).to.be.empty()
      expect(nodes[1].pubsub.getTopics()).to.include('Zb')
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('existing subscriptions are sent upon peer connection', async function () {
      this.timeout(5000)

      await Promise.all([
        connectPubsubNodes(nodes[0], nodes[1]),
        pEvent(nodes[0].pubsub, 'subscription-change'),
        pEvent(nodes[1].pubsub, 'subscription-change')
      ])

      expect(nodes[0].pubsub.getTopics()).to.include('Za')
      expect(nodes[1].pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodes[1].pubsub.getSubscribers('Za').map((p) => p.toString())).to.include(
        nodes[0].components.peerId.toString()
      )

      expect(nodes[1].pubsub.getTopics()).to.include('Zb')
      expect(nodes[0].pubsub.getPeers()).to.have.lengthOf(1)
      expect(nodes[0].pubsub.getSubscribers('Zb').map((p) => p.toString())).to.include(
        nodes[1].components.peerId.toString()
      )
    })
  })

  describe('nodes handle stopping', () => {
    let nodes: GossipSubAndComponents[]

    // Create pubsub nodes
    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: 2,
        connected: true
      })
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it("nodes don't have peers after stopped", async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      expect(nodes[0].pubsub.getPeers()).to.be.empty()
      expect(nodes[1].pubsub.getPeers()).to.be.empty()
    })
  })
})
