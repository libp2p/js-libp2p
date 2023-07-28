import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { mockNetwork } from '@libp2p/interface-compliance-tests/mocks'
import { stop } from '@libp2p/interface/startable'
import {
  connectAllPubSubNodes,
  connectPubsubNodes,
  createComponents,
  createComponentsArray,
  type GossipSubAndComponents
} from './utils/create-pubsub.js'

describe('signature policy', () => {
  describe('strict-sign', () => {
    const numNodes = 3
    let nodes: GossipSubAndComponents[]

    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: numNodes,
        connected: false,
        init: {
          scoreParams: {
            IPColocationFactorThreshold: 3
          },
          // crucial line
          globalSignaturePolicy: 'StrictSign'
        }
      })
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('should publish a message', async () => {
      const topic = 'foo'

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect all nodes
      await connectAllPubSubNodes(nodes)

      // wait for subscriptions to be transmitted
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'subscription-change')))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(numNodes - 1)
    })

    it('should forward a valid message', async () => {
      const topic = 'foo'

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect in a line
      await Promise.all(Array.from({ length: numNodes - 1 }, (_, i) => connectPubsubNodes(nodes[i], nodes[i + 1])))

      // wait for subscriptions to be transmitted
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'subscription-change')))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(1)

      // the last node should get the message
      await pEvent(nodes[nodes.length - 1].pubsub, 'gossipsub:message')
    })

    it('should not forward an strict-no-sign message', async () => {
      const topic = 'foo'

      // add a no-sign peer to nodes
      nodes.unshift(
        await createComponents({
          init: {
            globalSignaturePolicy: 'StrictNoSign'
          }
        })
      )

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect in a line
      await Promise.all(Array.from({ length: numNodes - 1 }, (_, i) => connectPubsubNodes(nodes[i], nodes[i + 1])))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(1)

      // the last node should NOT get the message
      try {
        await pEvent(nodes[nodes.length - 1].pubsub, 'gossipsub:message', { timeout: 200 })
        expect.fail('no-sign message should not be emitted from strict-sign peer')
      } catch (e) {}
    })
  })

  describe('strict-no-sign', () => {
    const numNodes = 3
    let nodes: GossipSubAndComponents[]

    beforeEach(async () => {
      mockNetwork.reset()
      nodes = await createComponentsArray({
        number: numNodes,
        connected: false,
        init: {
          scoreParams: {
            IPColocationFactorThreshold: 3
          },
          // crucial line
          globalSignaturePolicy: 'StrictNoSign'
        }
      })
    })

    afterEach(async () => {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
      mockNetwork.reset()
    })

    it('should publish a message', async () => {
      const topic = 'foo'

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect all nodes
      await connectAllPubSubNodes(nodes)

      // wait for subscriptions to be transmitted
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'subscription-change')))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(numNodes - 1)
    })

    it('should forward a valid message', async () => {
      const topic = 'foo'

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect in a line
      await Promise.all(Array.from({ length: numNodes - 1 }, (_, i) => connectPubsubNodes(nodes[i], nodes[i + 1])))

      // wait for subscriptions to be transmitted
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'subscription-change')))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(1)

      // the last node should get the message
      await pEvent(nodes[nodes.length - 1].pubsub, 'gossipsub:message')
    })

    it('should not forward an strict-sign message', async () => {
      const topic = 'foo'

      // add a no-sign peer to nodes
      nodes.unshift(
        await createComponents({
          init: {
            globalSignaturePolicy: 'StrictSign'
          }
        })
      )

      // add subscriptions to each node
      nodes.forEach((n) => n.pubsub.subscribe(topic))

      // connect in a line
      await Promise.all(Array.from({ length: numNodes - 1 }, (_, i) => connectPubsubNodes(nodes[i], nodes[i + 1])))

      // await mesh rebalancing
      await Promise.all(nodes.map(async (n) => await pEvent(n.pubsub, 'gossipsub:heartbeat')))

      // publish a message on the topic
      const result = await nodes[0].pubsub.publish(topic, new Uint8Array())
      expect(result.recipients).to.length(1)

      // the last node should NOT get the message
      try {
        await pEvent(nodes[nodes.length - 1].pubsub, 'gossipsub:message', { timeout: 200 })
        expect.fail('no-sign message should not be emitted from strict-sign peer')
      } catch (e) {}
    })
  })
})
