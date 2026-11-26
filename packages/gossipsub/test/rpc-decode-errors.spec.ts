import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { encode } from 'it-length-prefixed'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { Uint8ArrayList } from 'uint8arraylist'
import { RPC } from '../src/message/rpc.ts'
import { connectAllPubSubNodes, createComponentsArray } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { Stream } from '@libp2p/interface'

// a 1-byte body holding an incomplete field tag, which fails RPC decoding
const undecodable = Uint8Array.from([0x1a])
// what an extensions control message decodes to here
const emptyControl = RPC.encode({ subscriptions: [], messages: [], control: { ihave: [], iwant: [], graft: [], prune: [], idontwant: [] } })
const zeroLength = new Uint8Array(0)

describe('gossip / inbound RPC decode errors', () => {
  const maxInboundRpcDecodeErrors = 3
  let nodes: GossipSubAndComponents[]
  let idA: string

  async function createNodes (init = {}): Promise<void> {
    nodes = await createComponentsArray({
      number: 2,
      init: {
        maxInboundRpcDecodeErrors,
        // keep behaviour penalties from decaying during the test
        scoreParams: { decayInterval: 60 * 1000 },
        ...init
      }
    })
    await connectAllPubSubNodes(nodes)
    idA = nodes[0].components.peerId.toString()
    // wait for the inbound stream nodeA opens itself
    await pWaitFor(() => nodes[1].pubsub.streamsInbound.has(idA), { timeout: 5000 })
  }

  afterEach(async () => {
    await stop(...nodes.flatMap((n) => [n.pubsub, ...Object.values(n.components)]))
  })

  async function openStream (): Promise<Stream> {
    const [nodeA, nodeB] = nodes
    const connection = nodeA.components.connectionManager.getConnections(nodeB.components.peerId)[0]
    if (connection == null) {
      throw new Error('Connection not found')
    }
    return connection.newStream(nodeA.pubsub.protocols)
  }

  function frames (bodies: Uint8Array[]): Uint8ArrayList {
    return new Uint8ArrayList(...encode(bodies))
  }

  function repeat (body: Uint8Array, count: number): Uint8Array[] {
    return Array.from({ length: count }, () => body)
  }

  function subscriptions (topics: string[]): Uint8Array[] {
    return topics.map((topic) => RPC.encode({ subscriptions: [{ subscribe: true, topic }], messages: [] }))
  }

  function penalty (): number | undefined {
    return nodes[1].pubsub.dumpPeerScoreStats()[idA]?.behaviourPenalty
  }

  async function waitForSubscriptions (topics: string[]): Promise<void> {
    const subscribed = (topic: string): boolean => nodes[1].pubsub.getSubscribers(topic).some((p) => p.toString() === idA)
    await pWaitFor(() => topics.every(subscribed), { timeout: 5000 })
  }

  it('aborts the inbound stream and penalizes the peer after too many decode errors', async function () {
    this.timeout(10 * 1000)
    await createNodes()

    const stream = await openStream()
    const closed = pEvent(stream, 'close')
    stream.send(frames(repeat(undecodable, 1000)))
    await closed

    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(false)
    expect(penalty()).to.equal(maxInboundRpcDecodeErrors)
    expect(nodes[1].pubsub.getScore(idA)).to.be.lessThan(0)
  })

  it('keeps the inbound stream open below the decode error budget', async function () {
    this.timeout(10 * 1000)
    await createNodes()
    const topics = Array.from({ length: 50 }, (_, i) => `topic-${i}`)

    const stream = await openStream()
    stream.send(frames([...repeat(undecodable, maxInboundRpcDecodeErrors - 1), ...subscriptions(topics)]))

    await waitForSubscriptions(topics)
    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(true)
    expect(penalty()).to.equal(maxInboundRpcDecodeErrors - 1)
  })

  const streamEndings: Array<{ name: string, end(stream: Stream): void }> = [
    { name: 'resets the stream', end: (stream) => { stream.abort(new Error('reset')) } },
    { name: 'sends an oversized length prefix', end: (stream) => { stream.send(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0x0f])) } }
  ]

  for (const { name, end } of streamEndings) {
    // eslint-disable-next-line no-loop-func
    it(`keeps counting decode errors after the peer ${name} and opens a new stream`, async function () {
      this.timeout(10 * 1000)
      await createNodes()

      const stream = await openStream()
      stream.send(frames(repeat(undecodable, maxInboundRpcDecodeErrors - 1)))
      await pWaitFor(() => penalty() === maxInboundRpcDecodeErrors - 1, { timeout: 5000 })
      end(stream)
      await pWaitFor(() => !nodes[1].pubsub.peers.has(idA), { timeout: 5000 })

      // the count and the penalty survive, so each new stream is aborted on its first decode error
      for (let cycle = 1; cycle <= 3; cycle++) {
        const next = await openStream()
        const closed = pEvent(next, 'close')
        next.send(frames(repeat(undecodable, maxInboundRpcDecodeErrors - 1)))
        await closed
        expect(penalty(), `penalty after cycle ${cycle}`).to.equal(maxInboundRpcDecodeErrors - 1 + cycle)
      }
    })
  }

  it('counts decode errors across a replaced inbound stream', async function () {
    this.timeout(10 * 1000)
    await createNodes()

    const pipePeerReadStream = sinon.spy(nodes[1].pubsub as any, 'pipePeerReadStream')

    const first = await openStream()
    first.send(frames(repeat(undecodable, maxInboundRpcDecodeErrors - 1)))
    await pWaitFor(() => penalty() === maxInboundRpcDecodeErrors - 1, { timeout: 5000 })

    // replaces the first stream, which stays readable
    const second = await openStream()
    await pWaitFor(() => pipePeerReadStream.callCount === 2, { timeout: 5000 })

    const secondClosed = pEvent(second, 'close')
    second.send(frames([undecodable]))
    await secondClosed
    expect(penalty()).to.equal(maxInboundRpcDecodeErrors)
    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(false)

    const firstClosed = pEvent(first, 'close')
    first.send(frames([undecodable]))
    await firstClosed
    expect(penalty()).to.equal(maxInboundRpcDecodeErrors + 1)
  })

  it('forgets the decode error count once the peer disconnects', async function () {
    this.timeout(10 * 1000)
    await createNodes()
    const decodeErrors = (nodes[1].pubsub as any).inboundRpcDecodeErrors as Map<string, number>

    const stream = await openStream()
    stream.send(frames(repeat(undecodable, maxInboundRpcDecodeErrors - 1)))
    await pWaitFor(() => decodeErrors.get(idA) === maxInboundRpcDecodeErrors - 1, { timeout: 5000 })

    await nodes[1].components.connectionManager.closeConnections(nodes[0].components.peerId)
    expect(decodeErrors.has(idA)).to.equal(false)
  })

  it('allows one empty RPC per stream without penalty', async function () {
    this.timeout(10 * 1000)
    await createNodes()
    const topics = ['topic-a', 'topic-b']

    const stream = await openStream()
    stream.send(frames([emptyControl, ...subscriptions(topics)]))

    await waitForSubscriptions(topics)
    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(true)
    expect(penalty()).to.equal(0)
  })

  it('aborts the inbound stream after too many empty RPCs', async function () {
    this.timeout(10 * 1000)
    await createNodes()

    const stream = await openStream()
    const closed = pEvent(stream, 'close')
    stream.send(frames([emptyControl, ...repeat(zeroLength, 1000)]))
    await closed

    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(false)
    expect(penalty()).to.equal(maxInboundRpcDecodeErrors)
  })

  it('penalizes RPCs over decodeRpcLimits without aborting the stream', async function () {
    this.timeout(10 * 1000)
    await createNodes({
      decodeRpcLimits: { maxSubscriptions: 1, maxMessages: 1, maxIhaveMessageIDs: 1, maxIwantMessageIDs: 1, maxIdontwantMessageIDs: 1, maxControlMessages: 1, maxPeerInfos: 1 },
      // stay above the graylist threshold, so the subscription below is accepted
      scoreParams: { decayInterval: 60 * 1000, behaviourPenaltyWeight: -1 }
    })
    const tooManySubscriptions = RPC.encode({ subscriptions: [{ topic: 'a' }, { topic: 'b' }], messages: [] })
    const topics = ['topic-a']

    const stream = await openStream()
    stream.send(frames([...repeat(tooManySubscriptions, 2 * maxInboundRpcDecodeErrors), ...subscriptions(topics)]))

    await waitForSubscriptions(topics)
    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(true)
    expect(penalty()).to.equal(2 * maxInboundRpcDecodeErrors)
  })

  it('does not abort a stream that ends cleanly when maxInboundRpcDecodeErrors is 0', async function () {
    this.timeout(10 * 1000)
    await createNodes({ maxInboundRpcDecodeErrors: 0 })
    const pipePeerReadStream = sinon.spy(nodes[1].pubsub as any, 'pipePeerReadStream')
    const topics = ['topic-a']

    const stream = await openStream()
    stream.send(frames(subscriptions(topics)))
    await waitForSubscriptions(topics)
    await stream.close()
    await pipePeerReadStream.firstCall.returnValue

    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(true)
    expect(penalty()).to.equal(0)

    const next = await openStream()
    const closed = pEvent(next, 'close')
    next.send(frames(repeat(undecodable, 10)))
    await closed
    expect(penalty()).to.equal(1)
  })

  it('does not penalize bursts of valid RPCs', async function () {
    this.timeout(10 * 1000)
    await createNodes()
    const topics = Array.from({ length: 500 }, (_, i) => `topic-${i}`)

    const stream = await openStream()
    stream.send(frames(subscriptions(topics)))

    await waitForSubscriptions(topics)
    expect(nodes[1].pubsub.streamsInbound.has(idA)).to.equal(true)
    expect(penalty()).to.equal(0)
  })
})
