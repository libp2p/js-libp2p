import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import { connectPubsubNodes, createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

const DEFAULT_MAX = 4 * 1024 * 1024 // 4 MiB — mirrors it-length-prefixed MAX_DATA_LENGTH

async function nodesArePubSubPeers (a: GossipSubAndComponents, b: GossipSubAndComponents): Promise<void> {
  await pWaitFor(
    () =>
      a.pubsub.streamsOutbound.has(b.components.peerId.toString()) &&
      a.pubsub.streamsInbound.has(b.components.peerId.toString()) &&
      b.pubsub.streamsOutbound.has(a.components.peerId.toString()) &&
      b.pubsub.streamsInbound.has(a.components.peerId.toString()),
    { timeout: 10000 }
  )
}

describe('message size limits', () => {
  const topic = 'test'
  let nodes: GossipSubAndComponents[]

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, n) => acc.concat(n.pubsub, ...Object.values(n.components)), []))
  })

  it('rejects a message that exceeds the default 4 MiB limit before any network I/O', async () => {
    nodes = await createComponentsArray({ number: 1 })
    nodes[0].pubsub.subscribe(topic)

    const oversized = new Uint8Array(DEFAULT_MAX + 1)

    await expect(nodes[0].pubsub.publish(topic, oversized)).to.be.rejectedWith(
      /too large|maxOutboundDataLength/i
    )
  })

  it('accepts a message exactly at the default 4 MiB limit', async () => {
    nodes = await createComponentsArray({ number: 2, connected: false })
    await connectPubsubNodes(nodes[0], nodes[1])
    await nodesArePubSubPeers(nodes[0], nodes[1])

    nodes[0].pubsub.subscribe(topic)
    nodes[1].pubsub.subscribe(topic)

    // Wait for mesh to form
    await pWaitFor(
      () =>
        (nodes[0].pubsub).mesh.get(topic)?.has(nodes[1].components.peerId.toString()) === true,
      { timeout: 10000 }
    )

    const atLimit = new Uint8Array(DEFAULT_MAX)

    // Should not throw — exactly at the limit passes the early guard
    await expect(nodes[0].pubsub.publish(topic, atLimit)).to.eventually.be.an('object')
  })

  it('allows publishing a message larger than 4 MiB when maxOutboundDataLength is raised', async () => {
    const eightMiB = 8 * 1024 * 1024
    nodes = await createComponentsArray({
      number: 2,
      connected: false,
      init: { maxOutboundDataLength: eightMiB }
    })
    await connectPubsubNodes(nodes[0], nodes[1])
    await nodesArePubSubPeers(nodes[0], nodes[1])

    nodes[0].pubsub.subscribe(topic)
    nodes[1].pubsub.subscribe(topic)

    await pWaitFor(
      () =>
        (nodes[0].pubsub).mesh.get(topic)?.has(nodes[1].components.peerId.toString()) === true,
      { timeout: 10000 }
    )

    const sixMiB = new Uint8Array(6 * 1024 * 1024)

    await expect(nodes[0].pubsub.publish(topic, sixMiB)).to.eventually.be.an('object')
  })

  it('includes message size and limit in the rejection error message', async () => {
    nodes = await createComponentsArray({ number: 1 })
    nodes[0].pubsub.subscribe(topic)

    const oversized = new Uint8Array(DEFAULT_MAX + 100)

    let errorMessage = ''
    try {
      await nodes[0].pubsub.publish(topic, oversized)
    } catch (err: any) {
      errorMessage = err.message
    }

    expect(errorMessage).to.include(String(DEFAULT_MAX + 100))
    expect(errorMessage).to.include(String(DEFAULT_MAX))
    expect(errorMessage).to.include('maxOutboundDataLength')
  })
})
