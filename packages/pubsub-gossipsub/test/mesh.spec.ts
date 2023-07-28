import { expect } from 'aegir/chai'
import delay from 'delay'
import { GossipsubDhi } from '../src/constants.js'
import type { GossipSub } from '../src/index.js'
import { connectAllPubSubNodes, createComponentsArray, type GossipSubAndComponents } from './utils/create-pubsub.js'
import { stop } from '@libp2p/interface/startable'
import { mockNetwork } from '@libp2p/interface-compliance-tests/mocks'
import { pEvent } from 'p-event'

describe('mesh overlay', () => {
  let nodes: GossipSubAndComponents[]

  // Create pubsub nodes
  beforeEach(async () => {
    mockNetwork.reset()
    nodes = await createComponentsArray({
      number: GossipsubDhi + 2,
      connected: false,
      init: {
        scoreParams: {
          IPColocationFactorThreshold: GossipsubDhi + 3
        }
      }
    })
  })

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
    mockNetwork.reset()
  })

  it('should add mesh peers below threshold', async function () {
    this.timeout(10e3)

    // test against node0
    const node0 = nodes[0]
    const topic = 'Z'

    // add subscriptions to each node
    nodes.forEach((node) => node.pubsub.subscribe(topic))

    // connect N (< GossipsubD) nodes to node0
    const N = 4
    await connectAllPubSubNodes(nodes.slice(0, N + 1))

    await delay(50)
    // await mesh rebalancing
    await new Promise((resolve) =>
      (node0.pubsub as GossipSub).addEventListener('gossipsub:heartbeat', resolve, {
        once: true
      })
    )

    const mesh = (node0.pubsub as GossipSub).mesh.get(topic)
    expect(mesh).to.have.property('size', N)
  })

  it('should remove mesh peers once above threshold', async function () {
    this.timeout(10e4)
    // test against node0
    const node0 = nodes[0]
    const topic = 'Z'

    // add subscriptions to each node
    nodes.forEach((node) => node.pubsub.subscribe(topic))

    await connectAllPubSubNodes(nodes)

    // await mesh rebalancing
    await pEvent(node0.pubsub, 'gossipsub:heartbeat')

    const mesh = (node0.pubsub as GossipSub).mesh.get(topic)
    expect(mesh).to.have.property('size').that.is.lte(GossipsubDhi)
  })
})
