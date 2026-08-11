import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { encode } from 'it-length-prefixed'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { concat, equals as uint8ArrayEquals } from 'uint8arrays'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { FloodsubID, GossipsubDhi, GossipsubFeature, GossipsubIDv10, GossipsubIDv11, GossipsubIDv12, GossipsubVersionLadder, protocolSupportsFeature } from '../src/constants.ts'
import { GossipSub as GossipSubClass } from '../src/gossipsub.ts'
import { TopicValidatorResult } from '../src/index.ts'
import { messageIdToString } from '../src/utils/messageIdToString.ts'
import { connectAllPubSubNodes, createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { Message } from '../src/index.ts'
import type { PeerStore } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { SinonStubbedInstance } from 'sinon'

describe('gossip', () => {
  let nodes: GossipSubAndComponents[]
  const maxInboundDataLength = 4096

  // Create pubsub nodes
  beforeEach(async () => {
    nodes = await createComponentsArray({
      number: GossipsubDhi + 2,
      connected: false,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: GossipsubDhi + 3
        },
        maxInboundDataLength,
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

  it('should not send idontwant to peers on protocols below v1.2', async function () {
    this.timeout(10e4)
    // this node only speaks gossipsub v1.1 and so must never receive IDONTWANT
    const legacyNode = nodes[1]
    legacyNode.pubsub.protocols = [GossipsubIDv11, GossipsubIDv10]

    const topic = 'Z'
    const subscriptionPromises = nodes.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    nodes.forEach((n) => { n.pubsub.subscribe(topic) })
    await connectAllPubSubNodes(nodes)
    await Promise.all(subscriptionPromises)
    await Promise.all(nodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // publish a message big enough to trigger IDONTWANT on every receiver
    const idontwantMinDataSize = nodes[0].pubsub.opts.idontwantMinDataSize
    await nodes[0].pubsub.publish(topic, new Uint8Array(idontwantMinDataSize + 1))

    // wait for the message and the resulting IDONTWANTs to propagate
    await Promise.all(nodes.slice(1).map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // v1.2 receivers exchanged IDONTWANTs with each other, the v1.1 peer got none
    expect(legacyNode.pubsub['idontwants'].size, 'v1.1 peer should not receive IDONTWANT').to.equal(0)
    const v12PeersWithIdontwants = nodes.slice(2).filter((n) => n.pubsub['idontwants'].size > 0)
    expect(v12PeersWithIdontwants, 'v1.2 peers should receive IDONTWANT').to.have.length.greaterThan(0)
  })

  it('should not forward messages to peers that sent IDONTWANT', async function () {
    this.timeout(10e4)
    const topic = 'Z'
    // use content-derived message ids so ids are known before publishing
    const trio = await createComponentsArray({
      number: 3,
      connected: false,
      init: {
        scoreParams: { IPColocationFactorThreshold: GossipsubDhi + 3 },
        msgIdFn: (msg: Message) => msg.data ?? new Uint8Array(0)
      }
    })
    // ensure the nodes are stopped in afterEach
    nodes.push(...trio)
    const [nodeA, nodeB, nodeC] = trio
    const nodeBId = nodeB.components.peerId.toString()

    const subscriptionPromises = trio.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    trio.forEach((n) => { n.pubsub.subscribe(topic) })
    await connectAllPubSubNodes(trio)
    await Promise.all(subscriptionPromises)
    await Promise.all(trio.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    // metrics are disabled in tests - install a stub for the metric under test that
    // ignores every other metric call
    const onIdontwantSkippedSend = sinon.stub()
    const noopMetric: any = new Proxy(() => noopMetric, { get: () => noopMetric })
    ;(nodeA.pubsub as any).metrics = new Proxy({}, {
      get: (_target, prop) => (prop === 'onIdontwantSkippedSend' ? onIdontwantSkippedSend : noopMetric)
    })

    const pubsubA = nodeA.pubsub as unknown as Partial<GossipSubClass> & {
      handleIdontwant: GossipSubClass['handleIdontwant']
      sendRpc: GossipSubClass['sendRpc']
    }
    const sendRpcSpy = sinon.spy(pubsubA, 'sendRpc')

    // B tells A it does not want the message before the message is published
    const refused = uint8ArrayFromString('b-does-not-want-this-message')
    pubsubA.handleIdontwant(nodeBId, [{ messageIDs: [refused] }])

    const receivedRefused = pEvent(nodeA.pubsub, 'gossipsub:message')
    await nodeC.pubsub.publish(topic, refused)
    await receivedRefused

    // control: a message B did not refuse is forwarded to B as usual
    const wanted = uint8ArrayFromString('b-wants-this-message')
    const receivedWanted = pEvent(nodeA.pubsub, 'gossipsub:message')
    await nodeC.pubsub.publish(topic, wanted)
    await receivedWanted

    const msgsSentToB = sendRpcSpy.getCalls()
      .filter((call) => call.args[0] === nodeBId)
      .flatMap((call) => call.args[1].messages ?? [])
    expect(msgsSentToB.some((msg) => msg.data != null && uint8ArrayEquals(msg.data, refused)), 'must not forward to a peer that sent IDONTWANT').to.be.false()
    expect(msgsSentToB.some((msg) => msg.data != null && uint8ArrayEquals(msg.data, wanted)), 'must forward messages the peer did not refuse').to.be.true()
    expect(onIdontwantSkippedSend.calledWith('forward'), 'must count the skipped send').to.be.true()
  })

  it('should not forward to peers whose IDONTWANT arrives during validation', async function () {
    this.timeout(10e4)
    const topic = 'Z'
    // use content-derived message ids so ids are known before publishing
    const trio = await createComponentsArray({
      number: 3,
      connected: false,
      init: {
        scoreParams: { IPColocationFactorThreshold: GossipsubDhi + 3 },
        msgIdFn: (msg: Message) => msg.data ?? new Uint8Array(0)
      }
    })
    // ensure the nodes are stopped in afterEach
    nodes.push(...trio)
    const [nodeA, nodeB, nodeC] = trio
    const nodeBId = nodeB.components.peerId.toString()

    const subscriptionPromises = trio.map(async (n) => pEvent(n.pubsub, 'subscription-change'))
    trio.forEach((n) => { n.pubsub.subscribe(topic) })
    await connectAllPubSubNodes(trio)
    await Promise.all(subscriptionPromises)
    await Promise.all(trio.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    const pubsubA = nodeA.pubsub as unknown as Partial<GossipSubClass> & {
      idontwants: Map<string, Map<string, number>>
      sendRpc: GossipSubClass['sendRpc']
    }
    const sendRpcSpy = sinon.spy(pubsubA, 'sendRpc')

    // hold nodeA's validation open until B's IDONTWANT has arrived
    let resolveValidation: () => void = () => {}
    const validationGate = new Promise<void>((resolve) => { resolveValidation = resolve })
    nodeA.pubsub.topicValidators.set(topic, async () => {
      await validationGate
      return TopicValidatorResult.Accept
    })

    // the message is big enough that every receiver broadcasts IDONTWANT for it
    const idontwantMinDataSize = nodeA.pubsub.opts.idontwantMinDataSize
    const data = concat([uint8ArrayFromString('validation-race'), new Uint8Array(idontwantMinDataSize)])

    const received = pEvent(nodeA.pubsub, 'gossipsub:message')
    await nodeC.pubsub.publish(topic, data)

    // B received the message from C and broadcast IDONTWANT - wait for A to track it,
    // then let A's validation finish
    await pWaitFor(() => pubsubA.idontwants.get(nodeBId)?.has(messageIdToString(data)) === true)
    resolveValidation()
    await received

    // control: a small message (no IDONTWANT broadcast) passes validation and is forwarded
    nodeA.pubsub.topicValidators.delete(topic)
    const wanted = uint8ArrayFromString('no-idontwant-race')
    const receivedWanted = pEvent(nodeA.pubsub, 'gossipsub:message')
    await nodeC.pubsub.publish(topic, wanted)
    await receivedWanted

    const msgsSentToB = sendRpcSpy.getCalls()
      .filter((call) => call.args[0] === nodeBId)
      .flatMap((call) => call.args[1].messages ?? [])
    expect(msgsSentToB.some((msg) => msg.data != null && uint8ArrayEquals(msg.data, data)), 'must not forward after IDONTWANT arrived during validation').to.be.false()
    expect(msgsSentToB.some((msg) => msg.data != null && uint8ArrayEquals(msg.data, wanted)), 'must forward messages the peer did not refuse').to.be.true()
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

  it('should delete empty topic entries after remote unsubscribe', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const topic = 'empty-topic-cleanup'

    await connectAllPubSubNodes([nodeA, nodeB])

    nodeA.pubsub.subscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    expect((nodeB.pubsub as any).topics.has(topic)).to.be.true()

    nodeA.pubsub.unsubscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    expect(nodeB.pubsub.getSubscribers(topic)).to.be.empty()
    expect((nodeB.pubsub as any).topics.has(topic)).to.be.false()
  })

  it('should delete empty topic entries after peer disconnect', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const topic = 'disconnect-topic-cleanup'

    await connectAllPubSubNodes([nodeA, nodeB])

    nodeA.pubsub.subscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    expect((nodeB.pubsub as any).topics.has(topic)).to.be.true()

    ;(nodeB.pubsub as any).onPeerDisconnected(nodeA.components.peerId)

    expect(nodeB.pubsub.getSubscribers(topic)).to.be.empty()
    expect((nodeB.pubsub as any).topics.has(topic)).to.be.false()
  })

  it('should not create empty topic entries from unsubscribe-only updates', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const topic = 'unsubscribe-only-cleanup'

    await connectAllPubSubNodes([nodeA, nodeB])

    ;(nodeB.pubsub as any).handleReceivedSubscription(nodeA.components.peerId, topic, false)

    expect((nodeB.pubsub as any).topics.has(topic)).to.be.false()
    expect(nodeB.pubsub.getSubscribers(topic)).to.be.empty()
  })

  it('should keep topic entries while other peers remain subscribed', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]
    const nodeC = nodes[2]
    const topic = 'multi-peer-topic-cleanup'

    await connectAllPubSubNodes([nodeA, nodeB, nodeC])

    nodeA.pubsub.subscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    nodeC.pubsub.subscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    expect((nodeB.pubsub as any).topics.has(topic)).to.be.true()
    expect(nodeB.pubsub.getSubscribers(topic)).to.have.lengthOf(2)

    nodeA.pubsub.unsubscribe(topic)
    await pEvent(nodeB.pubsub, 'subscription-change')

    expect((nodeB.pubsub as any).topics.has(topic)).to.be.true()
    const subscribers = nodeB.pubsub.getSubscribers(topic).map((p) => p.toString())
    expect(subscribers).to.have.lengthOf(1)
    expect(subscribers).to.include(nodeC.components.peerId.toString())
  })

  it('should reject oversized publish rpc during send due to maxInboundDataLength', async function () {
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
    const nodeALogErrorSpy = sinon.spy((nodeA.pubsub as any).log, 'error')

    const nodeBSpy = nodeB.pubsub as Partial<GossipSubClass> as SinonStubbedInstance<{
      handlePeerReadStreamError: GossipSubClass['handlePeerReadStreamError']
    }>
    sinon.spy(nodeBSpy, 'handlePeerReadStreamError')

    const onUnhandledRejection = (event: any): void => {
      if (event?.reason?.name === 'InvalidDataLengthError') {
        event.preventDefault?.()
      }
    }
    const hasGlobalUnhandledRejectionEvents =
      typeof (globalThis as any).addEventListener === 'function' &&
      typeof (globalThis as any).removeEventListener === 'function'

    if (hasGlobalUnhandledRejectionEvents) {
      (globalThis as any).addEventListener('unhandledrejection', onUnhandledRejection)
    }

    await pWaitFor(() => {
      const nodeAMesh = nodeA.pubsub.mesh.get(topic)
      const nodeBMesh = nodeB.pubsub.mesh.get(topic)

      if (nodeAMesh == null || nodeBMesh == null) {
        return false
      }

      return nodeAMesh.has(nodeB.components.peerId.toString()) && nodeBMesh.has(nodeA.components.peerId.toString())
    }, { timeout: 5000 })

    const messagePromise = pEvent(nodeB.pubsub, 'message', { timeout: 2000 })
      .then(() => true)
      .catch(() => false)

    try {
      // This should not be delivered to nodeB
      await nodeA.pubsub.publish(topic, new Uint8Array(maxInboundDataLength + 1))
      await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')

      const sawReadStreamError = await pWaitFor(() => nodeBSpy.handlePeerReadStreamError.called, { timeout: 5000 })
        .then(() => true)
        .catch(() => false)

      const sawWriteStreamError = nodeALogErrorSpy.getCalls().some((call) => {
        return call.args.some((arg) => arg?.name === 'InvalidDataLengthError')
      })

      expect(sawReadStreamError || sawWriteStreamError).to.equal(true)

      if (sawReadStreamError) {
        const expectedError = nodeBSpy.handlePeerReadStreamError.getCalls()[0]?.args[0]
        expect(expectedError).to.have.property('name', 'InvalidDataLengthError')
      }

      const messageReceived = await messagePromise
      expect(messageReceived).to.equal(false)
    } finally {
      if (hasGlobalUnhandledRejectionEvents) {
        (globalThis as any).removeEventListener('unhandledrejection', onUnhandledRejection)
      }
      nodeALogErrorSpy.restore()
      nodeBSpy.handlePeerReadStreamError.restore()
    }
  })

  it('should reject oversized inbound rpc due to maxInboundDataLength', async function () {
    this.timeout(10e4)
    const nodeA = nodes[0]
    const nodeB = nodes[1]

    const twoNodes = [nodeA, nodeB]

    // every node connected to every other
    await connectAllPubSubNodes(twoNodes)

    // await mesh rebalancing
    await Promise.all(twoNodes.map(async (n) => pEvent(n.pubsub, 'gossipsub:heartbeat')))

    const nodeBSpy = nodeB.pubsub as Partial<GossipSubClass> as SinonStubbedInstance<{
      handlePeerReadStreamError: GossipSubClass['handlePeerReadStreamError']
    }>
    sinon.spy(nodeBSpy, 'handlePeerReadStreamError')

    try {
      const connection = nodeA.components.connectionManager.getConnections(nodeB.components.peerId)[0]

      if (connection == null) {
        throw new Error('Connection not found')
      }

      const stream = await connection.newStream((nodeA.pubsub as any).protocols)
      stream.send(encode.single(new Uint8Array(maxInboundDataLength + 1), { maxDataLength: maxInboundDataLength + 1 }))

      await pWaitFor(() => nodeBSpy.handlePeerReadStreamError.called, { timeout: 5000 })

      const expectedError = nodeBSpy.handlePeerReadStreamError.getCalls()[0]?.args[0]
      expect(expectedError).to.have.property('name', 'InvalidDataLengthError')
    } finally {
      nodeBSpy.handlePeerReadStreamError.restore()
    }
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

describe('protocolSupportsFeature', () => {
  it('should support IDONTWANT from gossipsub v1.2 onward', () => {
    expect(protocolSupportsFeature(GossipsubIDv10, GossipsubFeature.IDontWant)).to.be.false()
    expect(protocolSupportsFeature(GossipsubIDv11, GossipsubFeature.IDontWant)).to.be.false()

    // every ladder entry from v1.2 onward supports IDONTWANT, including versions appended later
    for (const protocol of GossipsubVersionLadder.slice(GossipsubVersionLadder.indexOf(GossipsubIDv12))) {
      expect(protocolSupportsFeature(protocol, GossipsubFeature.IDontWant), protocol).to.be.true()
    }
  })

  it('should support PRUNE backoff from gossipsub v1.1 onward', () => {
    expect(protocolSupportsFeature(GossipsubIDv10, GossipsubFeature.Backoff)).to.be.false()

    // every ladder entry from v1.1 onward supports backoff, including versions appended later
    for (const protocol of GossipsubVersionLadder.slice(GossipsubVersionLadder.indexOf(GossipsubIDv11))) {
      expect(protocolSupportsFeature(protocol, GossipsubFeature.Backoff), protocol).to.be.true()
    }
  })

  it('should support no features for protocols not on the version ladder', () => {
    for (const feature of Object.values(GossipsubFeature)) {
      expect(protocolSupportsFeature(FloodsubID, feature), feature).to.be.false()
      expect(protocolSupportsFeature('/unknown/1.0.0', feature), feature).to.be.false()
      expect(protocolSupportsFeature(undefined, feature), feature).to.be.false()
    }
  })
})
