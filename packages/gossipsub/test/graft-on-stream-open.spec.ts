import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { connectPubsubNodes, createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

// graft-on-subscribe can only graft a peer when our outbound stream to them is
// already established. If a peer's SUBSCRIBE is handled before that stream exists,
// the graft is refused and the peer would otherwise wait for the next heartbeat.
// graft-on-stream-open is the mirror trigger: when the outbound stream opens, graft
// any peer we already know is subscribed.
describe('graft on stream open', () => {
  let nodes: GossipSubAndComponents[]

  afterEach(async () => {
    if (nodes != null) {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
    }
  })

  it('grafts a peer we already know is subscribed when our outbound stream opens', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    // a very long heartbeat means the periodic heartbeat cannot form the mesh, so
    // only a graft on stream-open can
    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    await connectPubsubNodes(node0, node1)
    const id1 = node1.components.peerId.toString()

    node0.pubsub.subscribe(topic)

    // wait until node0's outbound stream to node1 is live, so the graft-on-subscribe
    // stream guard is satisfied and the mesh-size cap is the only remaining gate
    await pWaitFor(() => node0.pubsub.streamsOutbound.has(id1), { timeout: 4000 })

    // reproduce the state graft-on-subscribe leaves behind when it is refused because
    // the outbound stream was not ready: node1 is a known subscriber but was never
    // grafted into the mesh
    const known = (node0.pubsub as any).topics.get(topic) ?? new Set<string>()
    known.add(id1)
    ;(node0.pubsub as any).topics.set(topic, known)
    expect(node0.pubsub.mesh.get(topic)?.has(id1) ?? false, 'precondition: node1 is not yet in the mesh').to.equal(false)

    // the stream-open trigger grafts the already-known subscriber. assert
    // synchronously, before node1's reaction round-trips back
    ;(node0.pubsub as any).graftEstablishedSubscribers(id1)

    expect(node0.pubsub.mesh.get(topic)?.has(id1), 'node1 is grafted when the outbound stream opens').to.equal(true)
  })

  it('runs the stream-open graft trigger from createOutboundStream when the stream opens', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    const id1 = node1.components.peerId.toString()

    // spy the trigger so this test covers the wiring in createOutboundStream rather
    // than the method in isolation: it must be invoked when the stream to node1 opens
    const grafted = sinon.spy(node0.pubsub as any, 'graftEstablishedSubscribers')

    node0.pubsub.subscribe(topic)
    node1.pubsub.subscribe(topic)

    await connectPubsubNodes(node0, node1)

    await pWaitFor(() => grafted.calledWith(id1), { timeout: 4000 })
    expect(grafted.calledWith(id1), 'the stream-open graft trigger ran for node1').to.equal(true)
  })

  it('sends a single batched GRAFT for a peer subscribed to several topics', async function () {
    this.timeout(20_000)
    const topics = ['topic-a', 'topic-b', 'topic-c']

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    await connectPubsubNodes(node0, node1)
    const id1 = node1.components.peerId.toString()

    for (const topic of topics) {
      node0.pubsub.subscribe(topic)
    }
    await pWaitFor(() => node0.pubsub.streamsOutbound.has(id1), { timeout: 4000 })

    // node1 is a known subscriber on every topic but was never grafted
    for (const topic of topics) {
      const known = (node0.pubsub as any).topics.get(topic) ?? new Set<string>()
      known.add(id1)
      ;(node0.pubsub as any).topics.set(topic, known)
    }

    const sendRpc = sinon.spy(node0.pubsub as any, 'sendRpc')
    ;(node0.pubsub as any).graftEstablishedSubscribers(id1)

    const graftRpcs = sendRpc.getCalls().filter((call) => call.args[0] === id1 && (call.args[1]?.control?.graft?.length ?? 0) > 0)
    const graftedTopics = graftRpcs.flatMap((call) => call.args[1].control.graft.map((g: { topicID: string }) => g.topicID))

    expect([...graftedTopics].sort(), 'grafts node1 on every subscribed topic').to.deep.equal([...topics].sort())
    expect(graftRpcs.length, 'the grafts are sent in one batched RPC').to.equal(1)
  })

  it('does not send a second GRAFT once the peer is already in the mesh', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    await connectPubsubNodes(node0, node1)
    const id1 = node1.components.peerId.toString()

    node0.pubsub.subscribe(topic)
    await pWaitFor(() => node0.pubsub.streamsOutbound.has(id1), { timeout: 4000 })
    const known = (node0.pubsub as any).topics.get(topic) ?? new Set<string>()
    known.add(id1)
    ;(node0.pubsub as any).topics.set(topic, known)

    // first trigger grafts node1
    ;(node0.pubsub as any).graftEstablishedSubscribers(id1)
    expect(node0.pubsub.mesh.get(topic)?.has(id1), 'node1 grafted on the first trigger').to.equal(true)

    // a later trigger (e.g. a subsequent graft-on-subscribe) must be a no-op, sharing
    // graftOnSubscribe's already-in-mesh guard, so no duplicate GRAFT is sent
    const sendGraft = sinon.spy(node0.pubsub as any, 'sendGraft')
    ;(node0.pubsub as any).graftEstablishedSubscribers(id1)

    expect(sendGraft.called, 'no second GRAFT once node1 is already meshed').to.equal(false)
  })

  it('does not graft a peer on stream-open unless we already know it is subscribed', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    await connectPubsubNodes(node0, node1)
    const id1 = node1.components.peerId.toString()

    // node0 is subscribed and has a live outbound stream to node1, but has never
    // heard node1 subscribe, so stream-open must not graft it
    node0.pubsub.subscribe(topic)
    await pWaitFor(() => node0.pubsub.streamsOutbound.has(id1), { timeout: 4000 })
    expect((node0.pubsub as any).topics.get(topic)?.has(id1) ?? false, 'precondition: node1 is not a known subscriber').to.equal(false)

    const sendGraft = sinon.spy(node0.pubsub as any, 'sendGraft')
    ;(node0.pubsub as any).graftEstablishedSubscribers(id1)

    expect(node0.pubsub.mesh.get(topic)?.has(id1) ?? false, 'a non-subscriber must not be grafted on stream-open').to.equal(false)
    expect(sendGraft.called, 'no GRAFT sent when nothing is grafted').to.equal(false)
  })
})
