import { expect } from 'aegir/chai'
import delay from 'delay'
import pRetry from 'p-retry'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import type { GossipSub } from '../../src/index.js'
import { GossipsubD } from '../../src/constants.js'
import { fastMsgIdFn } from '../utils/index.js'
import { type Message, TopicValidatorResult } from '@libp2p/interface/pubsub'
import type { IRPC, RPC } from '../../src/message/rpc.js'
import type { Libp2pEvents } from '@libp2p/interface'
import pWaitFor from 'p-wait-for'
import {
  sparseConnect,
  denseConnect,
  connectSome,
  createComponentsArray,
  createComponents,
  connectPubsubNodes,
  type GossipSubAndComponents
} from '../utils/create-pubsub.js'
import { FloodSub } from '@libp2p/floodsub'
import { mockNetwork } from '@libp2p/interface-compliance-tests/mocks'
import { stop } from '@libp2p/interface/startable'
import type { TopicScoreParams } from '../../src/score/peer-score-params.js'
import { awaitEvents, checkReceivedSubscription, checkReceivedSubscriptions } from '../utils/events.js'

/**
 * These tests were translated from:
 * https://github.com/libp2p/go-libp2p-pubsub/blob/master/gossipsub_test.go
 */

/**
 * Given a topic and data (and debug metadata -- sender index and msg index)
 * Return a function (takes a gossipsub (and receiver index))
 * that returns a Promise that awaits the message being received
 * and checks that the received message equals the given message
 */
const checkReceivedMessage =
  (topic: string, data: Uint8Array, senderIx: number, msgIx: number) =>
  async (node: GossipSubAndComponents, receiverIx: number) =>
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        node.pubsub.removeEventListener('message', cb)
        reject(new Error(`Message never received, sender ${senderIx}, receiver ${receiverIx}, index ${msgIx}`))
      }, 60000)
      const cb = (evt: CustomEvent<Message>) => {
        const msg = evt.detail

        if (msg.topic !== topic) {
          return
        }

        if (uint8ArrayEquals(data, msg.data)) {
          clearTimeout(t)
          node.pubsub.removeEventListener('message', cb)
          resolve()
        }
      }
      node.pubsub.addEventListener('message', cb)
    })

describe('go-libp2p-pubsub gossipsub tests', function () {
  // In Github runners it takes ~10sec the longest test
  this.timeout(120 * 1000)
  this.retries(3)

  let psubs: GossipSubAndComponents[]

  beforeEach(() => {
    mockNetwork.reset()
  })

  afterEach(async () => {
    await stop(...psubs.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
    mockNetwork.reset()
  })

  it('test sparse gossipsub', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes
    // Sparsely connect the nodes
    // Publish 100 messages, each from a random node
    // Assert that subscribed nodes receive the message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        floodPublish: false,
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await sparseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    const sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)

      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test dense gossipsub', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes
    // Densely connect the nodes
    // Publish 100 messages, each from a random node
    // Assert that subscribed nodes receive the message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        floodPublish: false,
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    const sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub fanout', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes except the first
    // Densely connect the nodes
    // Publish 100 messages, each from the first node
    // Assert that subscribed nodes receive the message
    // Subscribe to the topic, first node
    // Publish 100 messages, each from the first node
    // Assert that subscribed nodes receive the message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        floodPublish: false,
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'
    const promises = psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2))
    psubs.slice(1).forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(promises)

    let sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)

      const owner = 0

      const results = Promise.all(psubs.slice(1).map(checkReceivedMessage(topic, msg, owner, i)))
      await psubs[owner].pubsub.publish(topic, msg)
      await results
    }
    // await Promise.all(sendRecv)

    psubs[0].pubsub.subscribe(topic)

    // wait for a heartbeat
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 1)))

    sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`2nd - ${i} its not a flooooood ${i}`)

      const owner = 0

      const results = Promise.all(
        psubs
          .slice(1)
          .filter((psub, j) => j !== owner)
          .map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub fanout maintenance', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes except the first
    // Densely connect the nodes
    // Publish 100 messages, each from the first node
    // Assert that subscribed nodes receive the message
    // Unsubscribe to the topic, all nodes except the first
    // Resubscribe to the topic, all nodes except the first
    // Publish 100 messages, each from the first node
    // Assert that the subscribed nodes receive the message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        floodPublish: false,
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const promises = psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2))
    const topic = 'foobar'
    psubs.slice(1).forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(promises)
    let sendRecv: Array<Promise<unknown>> = []
    const sendMessages = async (time: number) => {
      for (let i = 0; i < 100; i++) {
        const msg = uint8ArrayFromString(`${time} ${i} its not a flooooood ${i}`)

        const owner = 0

        const results = Promise.all(
          psubs
            .slice(1)
            .filter((psub, j) => j !== owner)
            .map(checkReceivedMessage(topic, msg, owner, i))
        )
        await psubs[owner].pubsub.publish(topic, msg)
        sendRecv.push(results)
      }
    }
    await sendMessages(1)
    await Promise.all(sendRecv)

    psubs.slice(1).forEach((ps) => ps.pubsub.unsubscribe(topic))

    // wait for heartbeats
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
    psubs.slice(1).forEach((ps) => ps.pubsub.subscribe(topic))

    // wait for heartbeats
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
    sendRecv = []
    await sendMessages(2)
    await Promise.all(sendRecv)
  })

  it('test gossipsub fanout expiry', async function () {
    // Create 10 gossipsub nodes
    // Subscribe to the topic, all nodes except the first
    // Densely connect the nodes
    // Publish 5 messages, each from the first node
    // Assert that the subscribed nodes receive every message
    // Assert that the first node has fanout peers
    // Wait until fanout expiry
    // Assert that the first node has no fanout
    psubs = await createComponentsArray({
      number: 10,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        },
        floodPublish: false,
        fanoutTTL: 1000
      }
    })
    const promises = psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2))
    const topic = 'foobar'
    psubs.slice(1).forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(promises)

    const sendRecv = []
    for (let i = 0; i < 5; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)

      const owner = 0

      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      await psubs[owner].pubsub.publish(topic, msg)
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)

    expect((psubs[0].pubsub as GossipSub).fanout).to.not.be.empty()

    await pWaitFor(async () => {
      return (psubs[0].pubsub as GossipSub).fanout.size === 0
    })
  })

  it('test gossipsub gossip', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes
    // Densely connect the nodes
    // Publish 100 messages, each from a random node
    // Assert that the subscribed nodes receive the message
    // Wait a bit between each message so gossip can be interleaved
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const promises = psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2))
    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(promises)

    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      await psubs[owner].pubsub.publish(topic, msg)
      await results
      // wait a bit to have some gossip interleaved
      await delay(100)
    }
    // and wait for some gossip flushing
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
  })

  it('test gossipsub gossip propagation', async function () {
    // Create 20 gossipsub nodes
    // Split into two groups, just a single node shared between
    // Densely connect each group to itself
    // Subscribe to the topic, first group minus the shared node
    // Publish 10 messages, each from the shared node
    // Assert that the first group receives the messages
    // Subscribe to the topic, second group minus the shared node
    // Assert that the second group receives the messages (via gossip)
    psubs = await createComponentsArray({
      number: 20,
      init: {
        floodPublish: false,
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'
    const group1 = psubs.slice(0, GossipsubD + 1)
    const group2 = psubs.slice(GossipsubD + 1)
    group2.unshift(psubs[0])

    await denseConnect(group1)
    await denseConnect(group2)

    group1.slice(1).forEach((ps) => ps.pubsub.subscribe(topic))

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 3)))

    const sendRecv: Array<Promise<unknown>> = []
    for (let i = 0; i < 10; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = 0
      const results = Promise.all(group1.slice(1).map(checkReceivedMessage(topic, msg, owner, i)))
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)

    await delay(100)

    psubs.slice(GossipsubD + 1).forEach((ps) => ps.pubsub.subscribe(topic))

    const received: Message[][] = Array.from({ length: psubs.length - (GossipsubD + 1) }, () => [])
    const results = Promise.all(
      group2.slice(1).map(
        async (ps, ix) =>
          new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('Timed out')), 10000)
            ps.pubsub.addEventListener('message', (e: CustomEvent<Message>) => {
              if (e.detail.topic !== topic) {
                return
              }

              received[ix].push(e.detail)
              if (received[ix].length >= 10) {
                clearTimeout(t)
                resolve()
              }
            })
          })
      )
    )

    await results
  })

  it('test gossipsub prune', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes
    // Densely connect nodes
    // Unsubscribe to the topic, first 5 nodes
    // Publish 100 messages, each from a random node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20
        }
      }
    })
    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await denseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    // disconnect some peers from the mesh to get some PRUNEs
    psubs.slice(0, 5).forEach((ps) => ps.pubsub.unsubscribe(topic))

    // wait a bit to take effect
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    const sendRecv: Array<Promise<unknown>> = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs
          .slice(5)
          .filter((psub, j) => j + 5 !== owner)
          .map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub graft', async function () {
    // Create 20 gossipsub nodes
    // Sparsely connect nodes
    // Subscribe to the topic, all nodes, waiting for each subscription to propagate first
    // Publish 100 messages, each from a random node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'

    await sparseConnect(psubs)

    for (const ps of psubs) {
      ps.pubsub.subscribe(topic)
      // wait for announce to propagate
      await delay(100)
    }

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    const sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub remove peer', async function () {
    // Create 20 gossipsub nodes
    // Subscribe to the topic, all nodes
    // Densely connect nodes
    // Stop 5 nodes
    // Publish 100 messages, each from a random still-started node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20
        }
      }
    })
    const topic = 'foobar'

    await denseConnect(psubs)

    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    // disconnect some peers to exercise _removePeer paths
    afterEach(async () => {
      await stop(
        ...psubs
          .slice(0, 5)
          .reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), [])
      )
    })

    const sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * (psubs.length - 5))
      const results = Promise.all(
        psubs
          .slice(5)
          .filter((psub, j) => j !== owner)
          .map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs.slice(5)[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub graft prune retry', async function () {
    // Create 10 gossipsub nodes
    // Densely connect nodes
    // Subscribe to 35 topics, all nodes
    // Publish a message from each topic, each from a random node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 10,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20
        }
      }
    })
    const topic = 'foobar'

    await denseConnect(psubs)

    for (let i = 0; i < 35; i++) {
      psubs.forEach((ps) => ps.pubsub.subscribe(`${topic}${i}`))
    }

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 9)))

    for (let i = 0; i < 35; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(`${topic}${i}`, msg, owner, i))
      )
      await psubs[owner].pubsub.publish(`${topic}${i}`, msg)
      await delay(20)
      await results
    }
  })

  it.skip('test gossipsub control piggyback', async function () {
    // Create 10 gossipsub nodes
    // Densely connect nodes
    // Subscribe to a 'flood' topic, all nodes
    // Publish 10k messages on the flood topic, each from a random node, in the background
    // Subscribe to 5 topics, all nodes
    // Wait for the flood to stop
    // Publish a message to each topic, each from a random node
    // Assert that subscribed nodes receive each message
    // Publish a message from each topic, each from a random node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 10,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'

    await denseConnect(psubs)

    const floodTopic = 'flood'
    psubs.forEach((ps) => ps.pubsub.subscribe(floodTopic))

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 1)))

    // create a background flood of messages that overloads the queues
    const floodOwner = Math.floor(Math.random() * psubs.length)
    const floodMsg = uint8ArrayFromString('background flooooood')
    const backgroundFlood = Promise.resolve().then(async () => {
      for (let i = 0; i < 10000; i++) {
        await psubs[floodOwner].pubsub.publish(floodTopic, floodMsg)
      }
    })

    await delay(20)

    // and subscribe to a bunch of topics in the meantime -- this should
    // result in some dropped control messages, with subsequent piggybacking
    // in the background flood
    for (let i = 0; i < 5; i++) {
      psubs.forEach((ps) => ps.pubsub.subscribe(`${topic}${i}`))
    }

    // wait for the flood to stop
    await backgroundFlood

    // and test that we have functional overlays
    const sendRecv: Array<Promise<unknown>> = []
    for (let i = 0; i < 5; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(`${topic}${i}`, msg, owner, i))
      )
      await psubs[owner].pubsub.publish(`${topic}${i}`, msg)
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test mixed gossipsub', async function () {
    // Create 20 gossipsub nodes
    // Create 10 floodsub nodes
    // Subscribe to the topic, all nodes
    // Sparsely connect nodes
    // Publish 100 messages, each from a random node
    // Assert that the subscribed nodes receive every message
    const gsubs: GossipSubAndComponents[] = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        },
        fastMsgIdFn
      }
    })
    const fsubs = await createComponentsArray({
      number: 10,
      pubsub: FloodSub
    })
    psubs = gsubs.concat(fsubs)

    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await sparseConnect(psubs)

    // wait for heartbeats to build mesh
    await Promise.all(gsubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    const sendRecv = []
    for (let i = 0; i < 100; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = Math.floor(Math.random() * psubs.length)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub multihops', async function () {
    // Create 6 gossipsub nodes
    // Connect nodes in a line (eg: 0 -> 1 -> 2 -> 3 ...)
    // Subscribe to the topic, all nodes
    // Publish a message from node 0
    // Assert that the last node receives the message
    const numPeers = 6
    psubs = await createComponentsArray({
      number: numPeers,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20,
          behaviourPenaltyWeight: 0
        }
      }
    })
    const topic = 'foobar'

    for (let i = 0; i < numPeers - 1; i++) {
      await connectPubsubNodes(psubs[i], psubs[i + 1])
    }
    const peerIdStrsByIdx: string[][] = []
    for (let i = 0; i < numPeers; i++) {
      if (i === 0) {
        // first
        peerIdStrsByIdx[i] = [psubs[i + 1].components.peerId.toString()]
      } else if (i > 0 && i < numPeers - 1) {
        // middle
        peerIdStrsByIdx[i] = [psubs[i + 1].components.peerId.toString(), psubs[i - 1].components.peerId.toString()]
      } else if (i === numPeers - 1) {
        // last
        peerIdStrsByIdx[i] = [psubs[i - 1].components.peerId.toString()]
      }
    }

    const subscriptionPromises = psubs.map(
      async (psub, i) => await checkReceivedSubscriptions(psub, peerIdStrsByIdx[i], topic)
    )
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
    await Promise.all(subscriptionPromises)

    const msg = uint8ArrayFromString(`${0} its not a flooooood ${0}`)
    const owner = 0
    const results = checkReceivedMessage(topic, msg, owner, 0)(psubs[5], 5)
    await psubs[owner].pubsub.publish(topic, msg)
    await results
  })

  it('test gossipsub tree topology', async function () {
    // Create 10 gossipsub nodes
    // Connect nodes in a tree, diagram below
    // Subscribe to the topic, all nodes
    // Assert that the nodes are peered appropriately
    // Publish two messages, one from either end of the tree
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 10,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 20
        }
      }
    })
    const topic = 'foobar'

    /*
     [0] -> [1] -> [2] -> [3]
      |      L->[4]
      v
     [5] -> [6] -> [7]
      |
      v
     [8] -> [9]
    */
    const treeTopology = [
      [1, 5], // 0
      [2, 4], // 1
      [3], // 2
      [], // 3 leaf
      [], // 4 leaf
      [6, 8], // 5
      [7], // 6
      [], // 7 leaf
      [9], // 8
      [] // 9 leaf
    ]
    for (let from = 0; from < treeTopology.length; from++) {
      for (const to of treeTopology[from]) {
        await connectPubsubNodes(psubs[from], psubs[to])
      }
    }

    const getPeerIdStrs = (idx: number): string[] => {
      const outbounds = treeTopology[idx]
      const inbounds = []
      for (let i = 0; i < treeTopology.length; i++) {
        if (treeTopology[i].includes(idx)) inbounds.push(i)
      }
      return Array.from(new Set([...inbounds, ...outbounds])).map((i) => psubs[i].components.peerId.toString())
    }

    const subscriptionPromises = psubs.map(
      async (psub, i) => await checkReceivedSubscriptions(psub, getPeerIdStrs(i), topic)
    )
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    // wait for heartbeats to build mesh
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
    await Promise.all(subscriptionPromises)

    expect(psubs[0].pubsub.getPeers().map((s) => s.toString())).to.have.members([
      psubs[1].components.peerId.toString(),
      psubs[5].components.peerId.toString()
    ])
    expect(psubs[1].pubsub.getPeers().map((s) => s.toString())).to.have.members([
      psubs[0].components.peerId.toString(),
      psubs[2].components.peerId.toString(),
      psubs[4].components.peerId.toString()
    ])
    expect(psubs[2].pubsub.getPeers().map((s) => s.toString())).to.have.members([
      psubs[1].components.peerId.toString(),
      psubs[3].components.peerId.toString()
    ])

    const sendRecv = []
    for (const owner of [9, 3]) {
      const msg = uint8ArrayFromString(`${owner} its not a flooooood ${owner}`)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, owner))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub star topology with signed peer records', async function () {
    // Create 20 gossipsub nodes with lower degrees
    // Connect nodes to a center node, with the center having very low degree
    // Subscribe to the topic, all nodes
    // Assert that all nodes have > 1 connection
    // Publish one message per node
    // Assert that the subscribed nodes receive every message
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreThresholds: {
          acceptPXThreshold: 0
        },
        scoreParams: {
          IPColocationFactorThreshold: 20
        },
        doPX: true,
        D: 4,
        Dhi: 5,
        Dlo: 3,
        Dscore: 3,
        prunePeers: 5
      }
    })

    // configure the center of the star with very low D
    ;(psubs[0].pubsub as GossipSub).opts.D = 0
    ;(psubs[0].pubsub as GossipSub).opts.Dhi = 0
    ;(psubs[0].pubsub as GossipSub).opts.Dlo = 0
    ;(psubs[0].pubsub as GossipSub).opts.Dscore = 0

    // build the star
    await Promise.all(psubs.slice(1).map((ps) => connectPubsubNodes(psubs[0], ps)))
    await Promise.all(psubs.map((ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    // build the mesh
    const topic = 'foobar'
    const peerIdStrs = psubs.map((psub) => psub.components.peerId.toString())
    const subscriptionPromise = checkReceivedSubscriptions(psubs[0], peerIdStrs, topic)
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    // wait a bit for the mesh to build
    await Promise.all(psubs.map((ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 15, 25000)))
    await subscriptionPromise

    // check that all peers have > 1 connection
    psubs.forEach((ps) => {
      expect(ps.components.connectionManager.getConnections().length).to.be.gt(1)
    })

    // send a message from each peer and assert it was propagated
    const sendRecv = []
    for (let i = 0; i < psubs.length; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = i
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub direct peers', async function () {
    // Create 3 gossipsub nodes
    // 2 and 3 with direct peer connections with each other
    // Connect nodes: 2 <- 1 -> 3
    // Assert that the nodes are connected
    // Subscribe to the topic, all nodes
    // Publish a message from each node
    // Assert that all nodes receive the messages
    // Disconnect peers
    // Assert peers reconnect
    // Publish a message from each node
    // Assert that all nodes receive the messages
    psubs = await Promise.all([
      createComponents({
        init: {
          scoreParams: {
            IPColocationFactorThreshold: 20
          },
          fastMsgIdFn,
          directConnectTicks: 2
        }
      }),
      createComponents({
        init: {
          scoreParams: {
            IPColocationFactorThreshold: 20
          },
          fastMsgIdFn,
          directConnectTicks: 2
        }
      }),
      createComponents({
        init: {
          scoreParams: {
            IPColocationFactorThreshold: 20
          },
          fastMsgIdFn
        }
      })
    ])
    ;(psubs[1].pubsub as GossipSub).direct.add(psubs[2].components.peerId.toString())
    await connectPubsubNodes(psubs[1], psubs[2])
    ;(psubs[2].pubsub as GossipSub).direct.add(psubs[1].components.peerId.toString())
    await connectPubsubNodes(psubs[2], psubs[1])

    // each peer connects to 2 other peers
    await connectPubsubNodes(psubs[0], psubs[1])
    await connectPubsubNodes(psubs[0], psubs[2])

    const topic = 'foobar'
    const peerIdStrs = psubs.map((libp2p) => libp2p.components.peerId.toString())
    let subscriptionPromises = psubs.map((libp2ps) => checkReceivedSubscriptions(libp2ps, peerIdStrs, topic))
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))
    await Promise.all(psubs.map((ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 1)))
    await Promise.all(subscriptionPromises)

    let sendRecv = []
    for (let i = 0; i < 3; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = i
      const results = Promise.all(psubs.filter((_, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i)))
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)

    const connectPromises = [1, 2].map((i) => awaitEvents(psubs[i].components.events, 'peer:connect', 1))
    // disconnect the direct peers to test reconnection
    // need more time to disconnect/connect/send subscriptions again
    subscriptionPromises = [
      checkReceivedSubscription(psubs[1], peerIdStrs[2], topic, 2, 10000),
      checkReceivedSubscription(psubs[2], peerIdStrs[1], topic, 1, 10000)
    ]
    await psubs[1].components.connectionManager.closeConnections(psubs[2].components.peerId)
    // TODO remove when https://github.com/libp2p/js-libp2p-interfaces/pull/268 is merged
    await psubs[2].components.connectionManager.closeConnections(psubs[1].components.peerId)

    await Promise.all(psubs.map((ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 5)))
    await Promise.all(connectPromises)
    await Promise.all(subscriptionPromises)
    expect(psubs[1].components.connectionManager.getConnections(psubs[2].components.peerId)).to.not.be.empty()

    sendRecv = []
    for (let i = 0; i < 3; i++) {
      const msg = uint8ArrayFromString(`2nd - ${i} its not a flooooood ${i}`)
      const owner = i
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub flood publish', async function () {
    // Create 30 gossipsub nodes
    // Connect in star topology
    // Subscribe to the topic, all nodes
    // Publish 20 messages, each from the center node
    // Assert that the other nodes receive the message
    const numPeers = 30
    psubs = await createComponentsArray({
      number: numPeers,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 30
        }
      }
    })

    await Promise.all(
      psubs.slice(1).map(async (ps) => {
        return await connectPubsubNodes(psubs[0], ps)
      })
    )

    const owner = 0
    const psub0 = psubs[owner]
    const peerIdStrs = psubs.filter((_, j) => j !== owner).map((psub) => psub.components.peerId.toString())
    // build the (partial, unstable) mesh
    const topic = 'foobar'
    const subscriptionPromise = checkReceivedSubscriptions(psub0, peerIdStrs, topic)
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 1)))
    await subscriptionPromise

    // send messages from the star and assert they were received
    const sendRecv = []
    for (let i = 0; i < 20; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const results = Promise.all(
        psubs.filter((psub, j) => j !== owner).map(checkReceivedMessage(topic, msg, owner, i))
      )
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
      sendRecv.push(results)
    }
    await Promise.all(sendRecv)
  })

  it('test gossipsub negative score', async function () {
    // Create 20 gossipsub nodes, with scoring params to quickly lower node 0's score
    // Connect densely
    // Subscribe to the topic, all nodes
    // Publish 20 messages, each from a different node, collecting all received messages
    // Assert that nodes other than 0 should not receive any messages from node 0
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 30,
          appSpecificScore: (p) => (p === psubs[0].components.peerId.toString() ? -1000 : 0),
          decayInterval: 1000,
          decayToZero: 0.01
        },
        scoreThresholds: {
          gossipThreshold: -10,
          publishThreshold: -100,
          graylistThreshold: -1000
        },
        fastMsgIdFn
      }
    })

    await denseConnect(psubs)

    const topic = 'foobar'
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 3)))

    psubs.slice(1).forEach((ps) =>
      ps.pubsub.addEventListener('message', (evt) => {
        if (evt.detail.type !== 'signed') {
          throw new Error('unexpected message type')
        }
        expect(evt.detail.from.equals(psubs[0].components.peerId)).to.be.false()
      })
    )

    const sendRecv = []
    for (let i = 0; i < 20; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = i
      sendRecv.push(psubs[owner].pubsub.publish(topic, msg))
    }
    await Promise.all(sendRecv)

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))
  })

  it('test gossipsub score validator ex', async function () {
    // Create 3 gossipsub nodes
    // Connect fully
    // Register a topic validator on node 0: ignore 1, reject 2
    // Subscribe to the topic, node 0
    // Publish 2 messages, from 1 and 2
    // Assert that 0 received neither message
    // Assert that 1's score is 0, 2's score is negative
    const topic = 'foobar'
    psubs = await createComponentsArray({
      number: 3,
      init: {
        scoreParams: {
          topics: {
            [topic]: {
              topicWeight: 1,
              timeInMeshQuantum: 1000,
              invalidMessageDeliveriesWeight: -1,
              invalidMessageDeliveriesDecay: 0.9999,
              timeInMeshWeight: 0,
              timeInMeshCap: 0,
              firstMessageDeliveriesWeight: 0,
              firstMessageDeliveriesDecay: 0,
              firstMessageDeliveriesCap: 0,
              meshMessageDeliveriesWeight: 0,
              meshMessageDeliveriesDecay: 0,
              meshMessageDeliveriesCap: 0,
              meshMessageDeliveriesThreshold: 0,
              meshMessageDeliveriesWindow: 0,
              meshMessageDeliveriesActivation: 0,
              meshFailurePenaltyWeight: 0,
              meshFailurePenaltyDecay: 0
            }
          }
        }
      }
    })

    await connectPubsubNodes(psubs[0], psubs[1])
    await connectPubsubNodes(psubs[1], psubs[2])
    await connectPubsubNodes(psubs[0], psubs[2])
    ;(psubs[0].pubsub as GossipSub).topicValidators.set(topic, async (propagationSource, m) => {
      if (propagationSource.equals(psubs[1].components.peerId)) return TopicValidatorResult.Ignore
      if (propagationSource.equals(psubs[2].components.peerId)) return TopicValidatorResult.Reject
      throw Error('Unknown PeerId')
    })

    psubs[0].pubsub.subscribe(topic)

    await delay(200)

    psubs[0].pubsub.addEventListener('message', () => expect.fail('node 0 should not receive any messages'))

    const msg = uint8ArrayFromString('its not a flooooood')
    await psubs[1].pubsub.publish(topic, msg)
    const msg2 = uint8ArrayFromString('2nd - its not a flooooood')
    await psubs[2].pubsub.publish(topic, msg2)

    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 2)))

    expect((psubs[0].pubsub as GossipSub).score.score(psubs[1].components.peerId.toString())).to.be.eql(0)
    expect((psubs[0].pubsub as GossipSub).score.score(psubs[2].components.peerId.toString())).to.be.lt(0)
  })

  it('test gossipsub piggyback control', async function () {
    psubs = await createComponentsArray({ number: 2 })
    const otherId = psubs[1].components.peerId.toString()
    const psub = psubs[0].pubsub as GossipSub

    const topic1 = 'topic_1'
    const topic2 = 'topic_2'
    const topic3 = 'topic_3'
    psub.mesh.set(topic1, new Set([otherId]))
    psub.mesh.set(topic2, new Set())

    const rpc: IRPC = {
      subscriptions: [],
      messages: []
    }

    const toGraft = (topicID: string): RPC.IControlGraft => ({ topicID })
    const toPrune = (topicID: string): RPC.IControlPrune => ({ topicID, peers: [] })

    psub.piggybackControl(otherId, rpc, {
      graft: [toGraft(topic1), toGraft(topic2), toGraft(topic3)],
      prune: [toPrune(topic1), toPrune(topic2), toPrune(topic3)],
      ihave: [],
      iwant: []
    })

    const expectedRpc: IRPC = {
      subscriptions: [],
      messages: [],
      control: {
        graft: [toGraft(topic1)],
        prune: [toPrune(topic2), toPrune(topic3)]
      }
    }

    expect(rpc).deep.equals(expectedRpc)

    await psub.stop()
  })

  it('test gossipsub opportunistic grafting', async function () {
    // Create 20 nodes
    // 6 real gossip nodes, 14 'sybil' nodes, unresponsive nodes
    // Connect some of the real nodes
    // Connect every sybil to every real node
    // Subscribe to the topic, all real nodes
    // Publish 300 messages from the real nodes
    // Wait for opgraft
    // Assert the real peer meshes have at least 2 honest peers
    const topic = 'test'
    psubs = await createComponentsArray({
      number: 20,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: 50,
          decayToZero: 0.01,
          topics: {
            [topic]: {
              topicWeight: 1,
              timeInMeshWeight: 0.00002777,
              timeInMeshQuantum: 1000,
              timeInMeshCap: 3600,
              firstMessageDeliveriesWeight: 100,
              firstMessageDeliveriesDecay: 0.99997,
              firstMessageDeliveriesCap: 1000,
              meshMessageDeliveriesWeight: 0,
              invalidMessageDeliveriesDecay: 0.99997
            } as TopicScoreParams
          }
        },
        scoreThresholds: {
          gossipThreshold: -10,
          publishThreshold: -100,
          graylistThreshold: -10000,
          opportunisticGraftThreshold: 1
        }
      }
    })
    const promises = psubs.map((ps) => awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 1))
    const real = psubs.slice(0, 6)
    const sybils = psubs.slice(6)

    const connectPromises = real.map(
      async (psub) => await awaitEvents<Libp2pEvents>(psub.components.events, 'peer:connect', 3)
    )
    await connectSome(real, 5)
    await Promise.all(connectPromises)
    sybils.forEach((s) => {
      ;(s.pubsub as GossipSub).handleReceivedRpc = async function () {
        //
      }
    })

    for (let i = 0; i < sybils.length; i++) {
      for (let j = 0; j < real.length; j++) {
        await connectPubsubNodes(sybils[i], real[j])
      }
    }

    await Promise.all(promises)

    const realPeerIdStrs = real.map((psub) => psub.components.peerId.toString())
    const subscriptionPromises = real.map((psub) => {
      const waitingPeerIdStrs = Array.from(psub.pubsub.getPeers().values())
        .map((p) => p.toString())
        .filter((peerId) => realPeerIdStrs.includes(peerId.toString()))
      return checkReceivedSubscriptions(psub, waitingPeerIdStrs, topic)
    })
    psubs.forEach((ps) => ps.pubsub.subscribe(topic))
    await Promise.all(subscriptionPromises)

    for (let i = 0; i < 300; i++) {
      const msg = uint8ArrayFromString(`${i} its not a flooooood ${i}`)
      const owner = i % real.length
      await psubs[owner].pubsub.publish(topic, msg)
    }

    // now wait for opgraft cycles
    await Promise.all(psubs.map(async (ps) => await awaitEvents(ps.pubsub, 'gossipsub:heartbeat', 7)))

    // check the honest node meshes, they should have at least 3 honest peers each
    const realPeerIds = real.map((r) => r.components.peerId.toString())

    await pRetry(
      async () => {
        for (const r of real) {
          const meshPeers = (r.pubsub as GossipSub).mesh.get(topic)

          if (meshPeers == null) {
            throw new Error('meshPeers was null')
          }

          let count = 0
          realPeerIds.forEach((p) => {
            if (meshPeers.has(p)) {
              count++
            }
          })

          if (count < 2) {
            await delay(100)
            throw new Error('Count was less than 3')
          }
        }
      },
      { retries: 10 }
    )
  })
})
