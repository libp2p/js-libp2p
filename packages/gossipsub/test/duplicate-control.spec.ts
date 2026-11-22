import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

describe('duplicate control messages', () => {
  const topic = 'Z'
  const count = 1000
  let nodes: GossipSubAndComponents[]
  let node: any
  let peer: string

  beforeEach(async () => {
    nodes = await createComponentsArray({
      number: 2,
      connected: true
    })

    node = nodes[0].pubsub
    peer = nodes[1].components.peerId.toString()

    node.subscribe(topic)
  })

  afterEach(async () => {
    sinon.restore()
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
  })

  it('should process repeated PRUNEs for the same topic once', async () => {
    node.mesh.get(topic).add(peer)

    const mergeSpy = sinon.spy(nodes[0].components.peerStore, 'merge')
    const events: CustomEvent[] = []
    node.addEventListener('gossipsub:prune', (evt: CustomEvent) => events.push(evt))

    await node.handlePrune(peer, new Array(count).fill({ topicID: topic, peers: [], backoff: 0 }))

    expect(node.mesh.get(topic).has(peer)).to.be.false()
    expect(events).to.have.lengthOf(1)
    expect(mergeSpy.callCount).to.equal(1)
  })

  it('should not emit a prune event for a peer that is not in the mesh', async () => {
    node.mesh.get(topic).delete(peer)

    const mergeSpy = sinon.spy(nodes[0].components.peerStore, 'merge')
    const events: CustomEvent[] = []
    node.addEventListener('gossipsub:prune', (evt: CustomEvent) => events.push(evt))

    await node.handlePrune(peer, new Array(count).fill({ topicID: topic, peers: [], backoff: 0 }))

    expect(events).to.be.empty()
    expect(mergeSpy.callCount).to.equal(0)
    // backoff is still honoured
    expect(node.backoff.get(topic)?.has(peer)).to.be.true()
  })

  it('should keep processing PRUNEs after one for an unknown topic', async () => {
    node.mesh.get(topic).add(peer)

    await node.handlePrune(peer, [
      { topicID: 'unknown', peers: [], backoff: 0 },
      { topicID: topic, peers: [], backoff: 0 }
    ])

    expect(node.mesh.get(topic).has(peer)).to.be.false()
  })

  it('should respond to repeated rejected GRAFTs for the same topic once', async () => {
    node.mesh.get(topic).delete(peer)
    // GRAFTs from a peer we are backing off are rejected with a PRUNE
    node.addBackoff(peer, topic)

    const mergeSpy = sinon.spy(nodes[0].components.peerStore, 'merge')
    const events: CustomEvent[] = []
    node.addEventListener('gossipsub:graft', (evt: CustomEvent) => events.push(evt))

    const prune = await node.handleGraft(peer, new Array(count).fill({ topicID: topic }))

    expect(node.mesh.get(topic).has(peer)).to.be.false()
    expect(prune).to.have.lengthOf(1)
    expect(events).to.be.empty()
    expect(mergeSpy.callCount).to.equal(0)
  })
})
