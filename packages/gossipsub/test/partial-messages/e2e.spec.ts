import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import { createComponents, connectPubsubNodes } from '../utils/create-pubsub.js'
import type { PartialMessage } from '../../src/types.js'
import type { GossipSubAndComponents } from '../utils/create-pubsub.js'

/**
 * End-to-end coverage: partial messages crossing a real stream between two
 * nodes, exercising RPC.encode -> muxed stream -> RPC.decode ->
 * handleReceivedPartial -> event dispatch as a single path.
 *
 * The rest of the partial-messages suite either hand-builds an RPC object
 * straight into handleReceivedRpc or spies sendRpc, so the encode/decode
 * boundary and the peer-state plumbing between the two halves are never
 * exercised together. These tests are the only ones that would catch a
 * field-number change, a topicID encoding mismatch, or a peer-keying bug.
 */
describe('partial messages - end to end', () => {
  let nodeA: GossipSubAndComponents
  let nodeB: GossipSubAndComponents

  beforeEach(async () => {
    nodeA = await createComponents({ init: { emitSelf: false } })
    nodeB = await createComponents({ init: { emitSelf: false } })
    await connectPubsubNodes(nodeA, nodeB)
  })

  afterEach(async () => {
    await stop(nodeA.pubsub, ...Object.entries(nodeA.components))
    await stop(nodeB.pubsub, ...Object.entries(nodeB.components))
  })

  /**
   * Wait until `from` has learned, over the wire, that `to` subscribes to
   * `topic` and what its partial options are. Both facts are prerequisites
   * for publishPartial to target the peer, and both arrive via SubOpts.
   */
  async function waitForPartialPeer (
    from: GossipSubAndComponents,
    to: GossipSubAndComponents,
    topic: string
  ): Promise<void> {
    const gs = from.pubsub as any
    const toId = to.components.peerId.toString()

    await pWaitFor(() => {
      return (gs.topics.get(topic)?.has(toId) ?? false) &&
        gs.peerPartialOpts.get(toId)?.get(topic) != null
    }, { timeout: 10000 })
  }

  it('delivers a partial message from publishPartial to the remote event', async () => {
    const topic = 'test-topic'

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    const received = pEvent<'gossipsub:partial-message', CustomEvent<PartialMessage>>(
      nodeB.pubsub, 'gossipsub:partial-message'
    )

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([1, 2, 3]),
      partialMessage: Uint8Array.from([4, 5, 6]),
      partsMetadata: Uint8Array.from([0b1010])
    })

    const msg = (await received).detail
    expect(msg.topic).to.equal(topic)
    expect(msg.groupID).to.deep.equal(Uint8Array.from([1, 2, 3]))
    expect(msg.partialMessage).to.deep.equal(Uint8Array.from([4, 5, 6]))
    expect(msg.partsMetadata).to.deep.equal(Uint8Array.from([0b1010]))
  })

  it('records the sending peer in the receiver PartialMessageState', async () => {
    const topic = 'test-topic'
    const aId = nodeA.components.peerId.toString()

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    const received = pEvent(nodeB.pubsub, 'gossipsub:partial-message')

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([9]),
      partsMetadata: Uint8Array.from([0b0011])
    })

    await received

    // Proves the from-peer keying survives the wire: the receiver must file
    // the metadata under the *sender's* peer id, not its own.
    const state = (nodeB.pubsub as any).partialMessageState.get(topic)
    expect(state.getPeerMetadata(Uint8Array.from([9]), aId)).to.deep.equal(Uint8Array.from([0b0011]))
  })

  it('omits partialMessage to a peer that supports but did not request partials', async () => {
    const topic = 'test-topic'

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    // B advertises it can send partials, but wants full messages itself.
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: false, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    const received = pEvent<'gossipsub:partial-message', CustomEvent<PartialMessage>>(
      nodeB.pubsub, 'gossipsub:partial-message'
    )

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([1]),
      partialMessage: Uint8Array.from([7, 7, 7]),
      partsMetadata: Uint8Array.from([0b1010])
    })

    const msg = (await received).detail
    // Spec: "it MUST NOT send this peer encoded partialMessage data since it
    // did not request it." Asserted after a real encode/decode round trip.
    expect(msg.partialMessage).to.be.undefined()
    expect(msg.partsMetadata).to.deep.equal(Uint8Array.from([0b1010]))
  })

  it('round-trips a multi-byte UTF-8 topic through the bytes topicID field', async () => {
    // topicID is `bytes` on the wire but a string in the API. A latin1/utf8
    // mismatch between the encoder and decoder only shows up above U+007F.
    const topic = 'tëst-tøpic-🜂'

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    const received = pEvent<'gossipsub:partial-message', CustomEvent<PartialMessage>>(
      nodeB.pubsub, 'gossipsub:partial-message'
    )

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([1]),
      partsMetadata: Uint8Array.from([0b1010])
    })

    expect((await received).detail.topic).to.equal(topic)
  })

  it('does not deliver partials to a peer with no partial subscription', async () => {
    const topic = 'test-topic'

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    // B subscribes normally — no partial flags in its SubOpts.
    nodeB.pubsub.subscribe(topic)

    const bId = nodeB.components.peerId.toString()
    await pWaitFor(() => ((nodeA.pubsub as any).topics.get(topic)?.has(bId) ?? false), { timeout: 10000 })

    let eventFired = false
    nodeB.pubsub.addEventListener('gossipsub:partial-message', () => { eventFired = true })

    nodeA.pubsub.publishPartial({
      topic,
      groupID: Uint8Array.from([1]),
      partialMessage: Uint8Array.from([4, 5, 6]),
      partsMetadata: Uint8Array.from([0b1010])
    })

    // Give any in-flight RPC a chance to arrive before asserting absence.
    await nodeA.pubsub.publish(topic, Uint8Array.from([1]))
    await pEvent(nodeB.pubsub, 'gossipsub:message')

    expect(eventFired).to.be.false()
  })

  it('still delivers full messages between partial-subscribed nodes', async () => {
    // Spec: "if the node is in a mixed network of partial and full messages,
    // and it requests partial messages, the node MUST support receiving full
    // messages." Asserted by observing an actual delivery, not by observing
    // that nothing threw.
    const topic = 'test-topic'
    const payload = Uint8Array.from([1, 2, 3, 4])

    nodeA.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
    nodeB.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })

    await waitForPartialPeer(nodeA, nodeB, topic)

    const received = pEvent<'message', CustomEvent<any>>(nodeB.pubsub, 'message')

    await nodeA.pubsub.publish(topic, payload)

    const msg = (await received).detail
    expect(msg.topic).to.equal(topic)
    expect(msg.data).to.deep.equal(payload)
  })

  it('gossips parts metadata to a real non-mesh peer during heartbeat', async () => {
    const topic = 'test-topic'

    // Heartbeat gossip only targets non-mesh peers. With the default mesh
    // parameters a two-node network grafts the only peer straight into the
    // mesh, so the publisher runs with grafting disabled to keep the peer a
    // non-mesh topic peer — the situation partial gossip actually exists for.
    const publisher = await createComponents({ init: { emitSelf: false, D: 0, Dlo: 0, Dhi: 0 } })

    try {
      await connectPubsubNodes(publisher, nodeB)

      publisher.pubsub.subscribePartial(topic, { requestsPartial: true, supportsSendingPartial: true })
      nodeB.pubsub.subscribePartial(topic, { requestsPartial: false, supportsSendingPartial: true })

      await waitForPartialPeer(publisher, nodeB, topic)

      // Seed local state without publishing, so the only route to B is
      // heartbeat gossip rather than publishPartial.
      const state = (publisher.pubsub as any).partialMessageState.get(topic)
      state.updateMetadata(Uint8Array.from([42]), publisher.components.peerId.toString(), Uint8Array.from([0b1100]))

      const received = pEvent<'gossipsub:partial-message', CustomEvent<PartialMessage>>(
        nodeB.pubsub, 'gossipsub:partial-message'
      )

      // Drive the real heartbeat so peer selection, mesh exclusion and score
      // thresholds are all in play, rather than hand-building the gossip map.
      await (publisher.pubsub as any).heartbeat()

      const msg = (await received).detail
      expect(msg.groupID).to.deep.equal(Uint8Array.from([42]))
      expect(msg.partsMetadata).to.deep.equal(Uint8Array.from([0b1100]))
      expect(msg.partialMessage).to.be.undefined()
    } finally {
      await stop(publisher.pubsub, ...Object.entries(publisher.components))
    }
  })
})
