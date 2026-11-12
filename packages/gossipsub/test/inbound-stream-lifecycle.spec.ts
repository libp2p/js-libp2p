import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { GossipSub as GossipSubClass } from '../src/gossipsub.ts'
import { createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { Stream } from '@libp2p/interface'
import type { SinonStubbedInstance } from 'sinon'

describe('inbound stream lifecycle', () => {
  let nodes: GossipSubAndComponents[]

  beforeEach(async () => {
    nodes = await createComponentsArray({ number: 2, connected: true })
  })

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
    sinon.restore()
  })

  it('keeps the peer when a replaced inbound stream errors', async () => {
    const [nodeA, nodeB] = nodes
    const aId = nodeA.components.peerId.toString()

    // wait until nodeB has created the inbound stream for nodeA
    await pWaitFor(() => nodeB.pubsub.streamsInbound.has(aId), { timeout: 10000 })

    const priorInboundStream = nodeB.pubsub.streamsInbound.get(aId)
    expect(priorInboundStream).to.not.be.undefined()

    // model a transport whose close never completes on a dead connection:
    // make the prior raw stream's close reject so InboundStream.close aborts
    // the raw stream and the pipe throws
    const { rawStream: priorRawStream } = priorInboundStream as unknown as { rawStream: Stream }
    priorRawStream.close = async () => { throw new Error('simulated close that never completes') }

    const nodeBSpy = nodeB.pubsub as Partial<GossipSubClass> as SinonStubbedInstance<{
      handlePeerReadStreamError: GossipSubClass['handlePeerReadStreamError']
    }>
    sinon.spy(nodeBSpy, 'handlePeerReadStreamError')

    // open a second gossipsub stream from A to B on the existing connection;
    // nodeB treats it as the new canonical inbound stream and closes the prior one
    const connection = nodeA.components.connectionManager.getConnections(nodeB.components.peerId)[0]
    expect(connection).to.not.be.undefined()
    await connection.newStream((nodeA.pubsub as any).protocols)

    // wait for B to see the prior stream error
    await pWaitFor(() => nodeBSpy.handlePeerReadStreamError.called, { timeout: 10000 })

    // the current inbound stream is healthy; the peer must still be held
    expect(nodeB.pubsub.peers.has(aId)).to.be.true()
    expect(nodeB.pubsub.streamsInbound.get(aId)).to.not.be.undefined()
    expect(nodeB.pubsub.streamsInbound.get(aId)).to.not.equal(priorInboundStream)
    expect(nodeB.pubsub.streamsOutbound.has(aId)).to.be.true()
  })
})
