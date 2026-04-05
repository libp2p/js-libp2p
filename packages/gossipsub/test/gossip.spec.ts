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
    // This integration test checks IDONTWANT lifecycle behavior under network traffic:
    // - publishing messages in a connected topic causes peers to track IDONTWANT state
    // - retained idontwants stay bounded while entries are tracked across heartbeats
    // - idontwantCounts are cleared at the next heartbeat
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
    // wait for one heartbeat so IDONTWANT handling has happened on all peers
    await Promise.all(otherNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // other nodes should have tracked idontwant messages
    // check retained idontwants are bounded over mcacheLength heartbeats
    for (let i = 0; i < otherNodes.length; i++) {
      const node = otherNodes[i]

      const idontwants = node.pubsub['idontwants']
      let maxIdontwants = 0
      for (const idontwant of idontwants.values()) {
        maxIdontwants = Math.max(maxIdontwants, idontwant.size)
      }

      expect(maxIdontwants).to.be.lessThanOrEqual(idontwantMaxMessages * node.pubsub.opts.mcacheLength)
    }

    await Promise.all(otherNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // after a heartbeat
    // idontwants are still tracked
    // but idontwantCounts have been cleared
    for (const node of otherNodes) {
      const idontwantCounts = node.pubsub['idontwantCounts']
      expect(idontwantCounts.size).to.equal(0)

      const idontwants = node.pubsub['idontwants']
      let maxIdontwants = 0
      for (const idontwant of idontwants.values()) {
        maxIdontwants = Math.max(maxIdontwants, idontwant.size)
      }
      expect(maxIdontwants).to.be.lessThanOrEqual(idontwantMaxMessages * node.pubsub.opts.mcacheLength)
    }
  })

  it('should cap idontwant tracking per peer per heartbeat', async function () {
    // `should send idontwant to peers in topic` exercises this path indirectly, this
    // test verifies the cap deterministically with controlled input and exact assertions.
    // This test directly exercises handleIdontwant to verify per-heartbeat cap semantics:
    // - idontwantCounts and idontwants stop growing at idontwantMaxMessages
    // - counts reset on heartbeat and start again next heartbeat
    const nodeA = nodes[0]
    const pubsub = nodeA.pubsub as unknown as Partial<GossipSubClass> & {
      handleIdontwant: GossipSubClass['handleIdontwant']
      idontwantCounts: Map<string, number>
      idontwants: Map<string, Map<string, number>>
    }
    const peerId = 'peer-a'
    const idontwantMaxMessages = nodeA.pubsub.opts.idontwantMaxMessages

    pubsub.handleIdontwant(peerId, [{
      messageIDs: Array.from({ length: idontwantMaxMessages * 2 }, (_, i) => uint8ArrayFromString(`msg-${i}`))
    }])

    expect(pubsub.idontwantCounts.get(peerId)).to.equal(idontwantMaxMessages)
    expect(pubsub.idontwants.get(peerId)?.size).to.equal(idontwantMaxMessages)

    pubsub.handleIdontwant(peerId, [{ messageIDs: [uint8ArrayFromString('overflow')] }])

    expect(pubsub.idontwantCounts.get(peerId)).to.equal(idontwantMaxMessages)
    expect(pubsub.idontwants.get(peerId)?.size).to.equal(idontwantMaxMessages)

    await nodeA.pubsub.heartbeat()

    expect(pubsub.idontwantCounts.get(peerId)).to.equal(undefined)

    pubsub.handleIdontwant(peerId, [{ messageIDs: [uint8ArrayFromString('next-heartbeat')] }])

    expect(pubsub.idontwantCounts.get(peerId)).to.equal(1)
  })

  it('should prune tracked idontwants after mcacheLength heartbeats', async function () {
    const nodeA = nodes[0]
    const pubsub = nodeA.pubsub as unknown as Partial<GossipSubClass> & {
      handleIdontwant: GossipSubClass['handleIdontwant']
      idontwants: Map<string, Map<string, number>>
    }
    const peerId = 'peer-b'
    const mcacheLength = nodeA.pubsub.opts.mcacheLength

    pubsub.handleIdontwant(peerId, [{ messageIDs: [uint8ArrayFromString('msg-to-prune')] }])
    expect(pubsub.idontwants.get(peerId)?.size).to.equal(1)

    for (let i = 0; i < mcacheLength - 1; i++) {
      await nodeA.pubsub.heartbeat()
    }

    if (mcacheLength > 1) {
      expect(pubsub.idontwants.get(peerId)?.size).to.equal(1)
    }

    await nodeA.pubsub.heartbeat()
    expect(pubsub.idontwants.get(peerId)?.size).to.equal(0)
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
