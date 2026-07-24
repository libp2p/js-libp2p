import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { GossipsubDlo } from '../src/constants.ts'
import { connectPubsubNodes, createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { Message } from '../src/index.ts'

describe('graft on subscribe', () => {
  let nodes: GossipSubAndComponents[]

  afterEach(async () => {
    if (nodes != null) {
      await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
    }
  })

  it('grafts a newly subscribed peer into the mesh without waiting for a heartbeat', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    // a very long heartbeat interval means the periodic heartbeat cannot form the
    // mesh during the test - only graft-on-subscribe can
    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    await connectPubsubNodes(nodes[0], nodes[1])

    // the one-off initial heartbeat fires 100ms after start; wait for it to pass as
    // a no-op (nothing is subscribed yet) so from here the mesh can only be formed
    // by handling a received SUBSCRIBE
    await delay(300)

    const [node0, node1] = nodes
    const id0 = node0.components.peerId.toString()
    const id1 = node1.components.peerId.toString()

    // subscribe both in the same tick so neither's join() sees the other yet; the
    // mesh link can then only come from handling the peer's received SUBSCRIBE
    node0.pubsub.subscribe(topic)
    node1.pubsub.subscribe(topic)

    await pWaitFor(
      () =>
        (node0.pubsub.mesh.get(topic)?.has(id1) ?? false) &&
        (node1.pubsub.mesh.get(topic)?.has(id0) ?? false),
      { timeout: 4000 }
    )

    expect(node0.pubsub.mesh.get(topic)?.has(id1), 'node0 should graft node1 on subscribe').to.equal(true)
    expect(node1.pubsub.mesh.get(topic)?.has(id0), 'node1 should graft node0 on subscribe').to.equal(true)
  })

  it('emits an outbound gossipsub:graft exactly once when grafting on subscribe', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    await connectPubsubNodes(nodes[0], nodes[1])
    await delay(300)

    const [node0, node1] = nodes
    const id1 = node1.components.peerId.toString()

    // the outbound GRAFT is what carries the event; sending it must dispatch
    // gossipsub:graft once, not once per code path
    let outboundGrafts = 0
    node0.pubsub.addEventListener('gossipsub:graft', (evt) => {
      if (evt.detail.topic === topic && evt.detail.direction === 'outbound') {
        outboundGrafts++
      }
    })

    node0.pubsub.subscribe(topic)
    node1.pubsub.subscribe(topic)

    await pWaitFor(() => node0.pubsub.mesh.get(topic)?.has(id1) ?? false, { timeout: 4000 })
    // allow any duplicate dispatch to arrive
    await delay(200)

    expect(outboundGrafts, 'one outbound gossipsub:graft per graft-on-subscribe').to.equal(1)
  })

  it('delivers a message published right after subscribing, through a still-forming relay', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    // long heartbeat so only graft-on-subscribe can form the relay's mesh
    nodes = await createComponentsArray({ number: 3, init: { heartbeatInterval: 60_000 } })

    // chain topology node0 <-> node1 <-> node2, so node2 is only reachable by node1
    // relaying - node0 and node2 are not directly connected
    await connectPubsubNodes(nodes[0], nodes[1])
    await connectPubsubNodes(nodes[1], nodes[2])

    // let the one-off initial heartbeat pass as a no-op before anyone subscribes
    await delay(300)

    const [node0, node1, node2] = nodes
    const id0 = node0.components.peerId.toString()
    const id2 = node2.components.peerId.toString()

    // subscribe all in the same tick, so the relay (node1) can only reach node2 if
    // it grafted node2 when it handled node2's SUBSCRIBE
    node0.pubsub.subscribe(topic)
    node1.pubsub.subscribe(topic)
    node2.pubsub.subscribe(topic)

    // wait for the relay's mesh to form via graft-on-subscribe before publishing, so
    // a mesh failure and a delivery failure are distinct
    await pWaitFor(
      () =>
        (node1.pubsub.mesh.get(topic)?.has(id0) ?? false) &&
        (node1.pubsub.mesh.get(topic)?.has(id2) ?? false),
      { timeout: 4000 }
    )

    const message = pEvent<'message', CustomEvent<Message>>(node2.pubsub, 'message', {
      filter: (evt) => evt.detail.topic === topic,
      timeout: 4000
    })

    await node0.pubsub.publish(topic, uint8ArrayFromString('hello'))

    const evt = await message
    expect(uint8ArrayToString(evt.detail.data)).to.equal('hello')
  })

  it('sends a single batched GRAFT when a peer subscribes to several topics at once', async function () {
    this.timeout(20_000)
    const topics = ['topic-a', 'topic-b', 'topic-c']

    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    const id1 = node1.components.peerId.toString()

    // both subscribe to every topic before connecting, so on connect each peer
    // announces all of them in one SUBSCRIBE RPC
    for (const topic of topics) {
      node0.pubsub.subscribe(topic)
      node1.pubsub.subscribe(topic)
    }

    // count the RPCs node0 sends to node1 that carry grafts
    const sendRpc = sinon.spy(node0.pubsub as any, 'sendRpc')

    await connectPubsubNodes(node0, node1)
    await pWaitFor(() => topics.every((t) => node0.pubsub.mesh.get(t)?.has(id1) ?? false), { timeout: 4000 })

    const graftRpcs = sendRpc.getCalls().filter((call) => call.args[0] === id1 && (call.args[1]?.control?.graft?.length ?? 0) > 0)
    const graftedTopics = graftRpcs.flatMap((call) => call.args[1].control.graft.map((g: { topicID: string }) => g.topicID))

    expect([...graftedTopics].sort(), 'node0 grafts node1 on every topic').to.deep.equal([...topics].sort())
    expect(graftRpcs.length, 'the grafts are sent in one batched RPC').to.equal(1)
  })

  it('does not graft on subscribe once the mesh is at Dlo', async function () {
    this.timeout(20_000)
    const topic = 'test-topic'

    // node1 is connected, so it has a live outbound stream and would pass every
    // graft guard except the mesh-size cap
    nodes = await createComponentsArray({ number: 2, init: { heartbeatInterval: 60_000 } })
    const [node0, node1] = nodes
    await connectPubsubNodes(node0, node1)

    const id1 = node1.components.peerId.toString()

    // wait until node0 has an outbound stream to node1, so node1 clears the stream
    // guard and the mesh-size cap is the only thing that can refuse the graft
    await pWaitFor(() => node0.pubsub.streamsOutbound.has(id1), { timeout: 4000 })

    // node0 subscribes so it has a mesh for the topic, then fill that mesh to Dlo
    // with placeholder peers - node1 can now only be grafted if the cap is ignored
    node0.pubsub.subscribe(topic)
    const mesh = node0.pubsub.mesh.get(topic)
    for (let i = 0; i < GossipsubDlo; i++) {
      mesh?.add(`placeholder-peer-${i}`)
    }
    const grafted = (node0.pubsub as unknown as { graftOnSubscribe(id: string, topic: string): boolean }).graftOnSubscribe(id1, topic)

    expect(grafted, 'graft-on-subscribe is refused when the mesh is at Dlo').to.equal(false)
    expect(node0.pubsub.mesh.get(topic)?.has(id1), 'node1 must not be added past Dlo').to.equal(false)
  })
})
