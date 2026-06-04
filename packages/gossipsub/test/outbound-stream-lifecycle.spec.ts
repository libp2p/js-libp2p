import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import { createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { Stream } from '@libp2p/interface'

describe('outbound stream lifecycle', () => {
  let nodes: GossipSubAndComponents[]

  beforeEach(async () => {
    nodes = await createComponentsArray({ number: 2, connected: true })
  })

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
  })

  it('removes an outbound stream from the registry when it closes', async () => {
    const [nodeA, nodeB] = nodes
    const bId = nodeB.components.peerId.toString()

    // wait until nodeA has opened an outbound stream to nodeB
    await pWaitFor(() => nodeA.pubsub.streamsOutbound.has(bId), { timeout: 10000 })

    const outboundStream = nodeA.pubsub.streamsOutbound.get(bId)
    expect(outboundStream).to.not.be.undefined()

    // simulate the underlying stream being reset/closed while the connection
    // itself stays open (e.g. a WebRTC stream reset or a relayed stream closing).
    // reach the wrapped stream directly to mimic a transport-level reset
    const { rawStream } = outboundStream as unknown as { rawStream: Stream }
    rawStream.abort(new Error('simulated stream reset'))

    // the closed stream must be removed from the registry, otherwise it blocks
    // every future outbound message to this peer for the life of the connection
    await pWaitFor(() => !nodeA.pubsub.streamsOutbound.has(bId), { timeout: 10000 })
    expect(nodeA.pubsub.streamsOutbound.has(bId)).to.be.false()
  })

  it('re-establishes an outbound stream after the previous one closes', async () => {
    const [nodeA, nodeB] = nodes
    const bId = nodeB.components.peerId.toString()

    await pWaitFor(() => nodeA.pubsub.streamsOutbound.has(bId), { timeout: 10000 })
    const first = nodeA.pubsub.streamsOutbound.get(bId)

    // kill the outbound stream while the connection stays open
    const { rawStream } = first as unknown as { rawStream: Stream }
    rawStream.abort(new Error('simulated stream reset'))

    await pWaitFor(() => !nodeA.pubsub.streamsOutbound.has(bId), { timeout: 10000 })

    // heartbeat reconciliation must re-create the stream on the still-open connection
    await pWaitFor(() => nodeA.pubsub.streamsOutbound.has(bId), { timeout: 10000 })
    const second = nodeA.pubsub.streamsOutbound.get(bId)
    expect(second).to.not.equal(first)
    expect(second?.status).to.equal('open')
  })

  it('does not replace a healthy outbound stream during the heartbeat', async () => {
    const [nodeA, nodeB] = nodes
    const bId = nodeB.components.peerId.toString()

    await pWaitFor(() => nodeA.pubsub.streamsOutbound.get(bId)?.status === 'open', { timeout: 10000 })
    const stream = nodeA.pubsub.streamsOutbound.get(bId)

    // let a couple of heartbeats run
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')
    await pEvent(nodeA.pubsub, 'gossipsub:heartbeat')

    // reconciliation must leave a healthy stream untouched
    expect(nodeA.pubsub.streamsOutbound.get(bId)).to.equal(stream)
  })
})
