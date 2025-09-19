import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { concat } from 'uint8arrays'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { GossipsubDhi } from '../src/constants.js'
import { GossipSub as GossipSubClass } from '../src/gossipsub.js'
import { connectAllPubSubNodes, createComponentsArray } from './utils/create-pubsub.js'
import type { GossipSubAndComponents } from './utils/create-pubsub.js'
import type { PeerStore } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { SinonStubbedInstance } from 'sinon'

describe('gossip', () => {
  let nodes: GossipSubAndComponents[]

  // Create pubsub nodes
  beforeEach(async () => {
    nodes = await createComponentsArray({
      number: GossipsubDhi + 2,
      connected: false,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: GossipsubDhi + 3
        },
        maxInboundDataLength: 4000000,
        allowPublishToZeroTopicPeers: false,
        idontwantMaxMessages: 10
      }
    })
  })

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
  })

  it('should send gossip to non-mesh peers in topic', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const topic = 'Z'

    const subscriptionPromises = nodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    // add subscriptions to each node
    nodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(nodes)

    // wait for subscriptions to be transmitted
    await Promise.all(subscriptionPromises)

    // await mesh rebalancing
    await Promise.all(nodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // set spy. NOTE: Forcing private property to be public
    const nodeASpy = nodeA.pubsub as Partial<GossipSubClass> as SinonStubbedInstance<{
      pushGossip: GossipSubClass['pushGossip']
    }>
    sinon.spy(nodeASpy, 'pushGossip')

    await nodeA.pubsub.publish(topic, uint8ArrayFromString('hey'))

    // gossip happens during the heartbeat
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')

    const mesh = (nodeA.pubsub).mesh.get(topic)

    if (mesh == null) {
      throw new Error('No mesh for topic')
    }

    nodeASpy.pushGossip
      .getCalls()
      .map((call) => call.args[0])
      .forEach((peerId) => {
        expect(mesh).to.not.include(peerId)
      })

    // unset spy
    nodeASpy.pushGossip.restore()
  })

  it('should send idontwant to peers in topic', async function () {
    // This test checks that idontwants and idontwantsCounts are correctly incrmemented
    // - idontwantCounts should track the number of idontwant messages received from a peer for a single heartbeat
    //   - it should increment on receive of idontwant msgs (up to limit)
    //   - it should be emptied after heartbeat
    // - idontwants should track the idontwant messages received from a peer along with the heartbeatId when received
    //   - it should increment on receive of idontwant msgs (up to limit)
    //   - it should be emptied after mcacheLength heartbeats
    this.timeout(10e4)
    const nodeA = nodes[0]
    const otherNodes = nodes.slice(1)
    const topic = 'Z'
    const idontwantMaxMessages = nodeA.pubsub.opts.idontwantMaxMessages
    const idontwantMinDataSize = nodeA.pubsub.opts.idontwantMinDataSize

    const subscriptionPromises = nodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    // add subscriptions to each node
    nodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(nodes)

    // wait for subscriptions to be transmitted
    await Promise.all(subscriptionPromises)

    // await mesh rebalancing
    await Promise.all(nodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // publish a bunch of messages, enough to fill up our idontwant caches
    for (let i = 0; i < idontwantMaxMessages * 2; i++) {
      const msg = concat([
        uint8ArrayFromString(i.toString()),
        new Uint8Array(idontwantMinDataSize)
      ])
      await nodeA.pubsub.publish(topic, msg)
    }
    // track the heartbeat when each node received the last message

    const ticks = otherNodes.map((n) => n.pubsub['heartbeatTicks'])

    // there's no event currently implemented to await, so just wait a bit - flaky :(
    // TODO figure out something more robust
    await new Promise((resolve) => setTimeout(resolve, 200))

    // other nodes should have received idontwant messages
    // check that idontwants <= GossipsubIdontwantMaxMessages
    for (let i = 0; i < otherNodes.length; i++) {
      const node = otherNodes[i]

      const currentTick = node.pubsub['heartbeatTicks']

      const idontwantCounts = node.pubsub['idontwantCounts']
      let minCount = Infinity
      let maxCount = 0
      for (const count of idontwantCounts.values()) {
        minCount = Math.min(minCount, count)
        maxCount = Math.max(maxCount, count)
      }
      // expect(minCount).to.be.greaterThan(0)
      expect(maxCount).to.be.lessThanOrEqual(idontwantMaxMessages)

      const idontwants = node.pubsub['idontwants']
      let minIdontwants = Infinity
      let maxIdontwants = 0
      for (const idontwant of idontwants.values()) {
        minIdontwants = Math.min(minIdontwants, idontwant.size)
        maxIdontwants = Math.max(maxIdontwants, idontwant.size)
      }
      // expect(minIdontwants).to.be.greaterThan(0)
      expect(maxIdontwants).to.be.lessThanOrEqual(idontwantMaxMessages)

      // sanity check that the idontwantCount matches idontwants.size
      // only the case if there hasn't been a heartbeat
      if (currentTick === ticks[i]) {
        expect(minCount).to.be.equal(minIdontwants)
        expect(maxCount).to.be.equal(maxIdontwants)
      }
    }

    await Promise.all(otherNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // after a heartbeat
    // idontwants are still tracked
    // but idontwantCounts have been cleared
    for (const node of nodes) {
      const idontwantCounts = node.pubsub['idontwantCounts']
      for (const count of idontwantCounts.values()) {
        expect(count).to.be.equal(0)
      }

      const idontwants = node.pubsub['idontwants']
      let minIdontwants = Infinity
      let maxIdontwants = 0
      for (const idontwant of idontwants.values()) {
        minIdontwants = Math.min(minIdontwants, idontwant.size)
        maxIdontwants = Math.max(maxIdontwants, idontwant.size)
      }
      // expect(minIdontwants).to.be.greaterThan(0)
      expect(maxIdontwants).to.be.lessThanOrEqual(idontwantMaxMessages)
    }
  })

  it('Should allow publishing to zero peers if flag is passed', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const topic = 'Z'

    const publishResult = await nodeA.pubsub.publish(topic, uint8ArrayFromString('hey'), {
      allowPublishToZeroTopicPeers: true
    })

    // gossip happens during the heartbeat
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')

    // should have sent message to peerB
    expect(publishResult.recipients).to.deep.equal([])
  })

  it('should tag peers', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const topic = 'Z'

    const twoNodes = [nodeA, nodeB]

    const graftPromises = twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:graft'))

    // add subscriptions to each node
    twoNodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(twoNodes)

    // await grafts
    await Promise.all(graftPromises)

    // await mesh rebalancing
    await Promise.all(twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    const peerInfoA = await nodeA.components.peerStore.get(nodeB.components.peerId).catch((e) => undefined)
    const peerInfoB = await nodeB.components.peerStore.get(nodeA.components.peerId).catch((e) => undefined)
    expect(peerInfoA?.tags.get(topic)?.value).to.equal(100)
    expect(peerInfoB?.tags.get(topic)?.value).to.equal(100)
  })

  it('should remove the tags upon pruning', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const topic = 'Z'

    const twoNodes = [nodeA, nodeB]

    const subscriptionPromises = nodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    // add subscriptions to each node
    twoNodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(nodes)

    // await for subscriptions to be transmitted
    await Promise.all(subscriptionPromises)

    // await mesh rebalancing
    await Promise.all(twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    twoNodes.forEach((n) => { n.pubsub.unsubscribe(topic) })

    // await for unsubscriptions to be transmitted
    // await mesh rebalancing
    await Promise.all(twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    const peerInfoA = await nodeA.components.peerStore.get(nodeB.components.peerId).catch((e) => undefined)
    const peerInfoB = await nodeB.components.peerStore.get(nodeA.components.peerId).catch((e) => undefined)
    expect(peerInfoA?.tags.get(topic)).to.be.undefined()
    expect(peerInfoB?.tags.get(topic)).to.be.undefined()
  })

  it.skip('should reject incoming messages bigger than maxInboundDataLength limit', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]

    const twoNodes = [nodeA, nodeB]
    const topic = 'Z'
    const subscriptionPromises = twoNodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    // add subscriptions to each node
    twoNodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(twoNodes)

    // wait for subscriptions to be transmitted
    await Promise.all(subscriptionPromises)

    // await mesh rebalancing
    await Promise.all(twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // set spy. NOTE: Forcing private property to be public
    const nodeBSpy = nodeB.pubsub as Partial<GossipSubClass> as SinonStubbedInstance<{
      handlePeerReadStreamError: GossipSubClass['handlePeerReadStreamError']
    }>
    sinon.spy(nodeBSpy, 'handlePeerReadStreamError')

    // This should lead to handlePeerReadStreamError at nodeB
    await nodeA.pubsub.publish(topic, new Uint8Array(5000000))
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')
    const expectedError = nodeBSpy.handlePeerReadStreamError.getCalls()[0]?.args[0]
    expect(expectedError).to.have.property('name', 'InvalidDataLengthError')

    // unset spy
    nodeBSpy.handlePeerReadStreamError.restore()
  })

  it('should send piggyback control into other sent messages', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const topic = 'Z'

    const promises = nodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    // add subscriptions to each node
    nodes.forEach((n) => { n.pubsub.subscribe(topic) })

    // every node connected to every other
    await connectAllPubSubNodes(nodes)

    // wait for subscriptions to be transmitted
    await Promise.all(promises)

    // await nodeA mesh rebalancing
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')

    const mesh = (nodeA.pubsub).mesh.get(topic)

    if (mesh == null) {
      throw new Error('No mesh for topic')
    }

    if (mesh.size === 0) {
      throw new Error('Topic mesh was empty')
    }

    const peerB = Array.from(mesh)[0]

    if (peerB == null) {
      throw new Error('Could not get peer from mesh')
    }

    // should have peerB as a subscriber to the topic
    expect(nodeA.pubsub.getSubscribers(topic).map((p) => p.toString())).to.include(
      peerB,
      "did not know about peerB's subscription to topic"
    )

    // should be able to send them messages
    expect((nodeA.pubsub).streamsOutbound.has(peerB)).to.be.true(
      'nodeA did not have connection open to peerB'
    )

    // set spy. NOTE: Forcing private property to be public
    const nodeASpy = sinon.spy(nodeA.pubsub, 'piggybackControl')
    // manually add control message to be sent to peerB
    const graft = { ihave: [], iwant: [], graft: [{ topicID: topic }], prune: [], idontwant: [] }
    ;(nodeA.pubsub).control.set(peerB, graft)
    ;(nodeA.pubsub).gossip.set(peerB, [])

    const publishResult = await nodeA.pubsub.publish(topic, uint8ArrayFromString('hey'))

    // should have sent message to peerB
    expect(publishResult.recipients.map((p) => p.toString())).to.include(peerB, 'did not send pubsub message to peerB')

    // wait until spy is called
    const startTime = Date.now()
    while (Date.now() - startTime < 5000) {
      if (nodeASpy.callCount > 0) { break }
    }

    expect(nodeASpy.callCount).to.be.equal(1)
    // expect control message to be sent alongside published message
    const call = nodeASpy.getCalls()[0]
    expect(call).to.have.deep.nested.property('args[1].control.graft', graft.graft)

    // unset spy
    nodeASpy.restore()
  })

  it('should allow configuring stream limits', async () => {
    const maxInboundStreams = 7
    const maxOutboundStreams = 5

    const registrar = stubInterface<Registrar>()
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)
    const pubsub = new GossipSubClass(
      {
        privateKey,
        peerId,
        registrar,
        peerStore: stubInterface<PeerStore>(),
        connectionManager: stubInterface<ConnectionManager>(),
        logger: defaultLogger()
      },
      {
        maxInboundStreams,
        maxOutboundStreams
      }
    )

    await pubsub.start()

    expect(registrar.register.called).to.be.true()
    expect(registrar.handle.getCall(0)).to.have.nested.property('args[2].maxInboundStreams', maxInboundStreams)
    expect(registrar.handle.getCall(0)).to.have.nested.property('args[2].maxOutboundStreams', maxOutboundStreams)

    await pubsub.stop()
  })
})
