/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import { randomBytes } from '@libp2p/crypto'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import drain from 'it-drain'
import delay from 'delay'
import { DefaultMetrics } from '../../src/metrics/index.js'
import { DefaultStats } from '../../src/metrics/stats.js'
import { createPeerId } from '../utils/creators/peer.js'
import toBuffer from 'it-to-buffer'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interfaces/peer-id'

describe('Metrics', () => {
  let peerId: PeerId
  let peerId2: PeerId

  before(async () => {
    peerId = await createPeerId()
    peerId2 = await createPeerId()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should not track data if not started', async () => {
    const [local, remote] = duplexPair<Uint8Array>()
    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 50
    })

    metrics.trackStream({
      stream: local,
      remotePeer: peerId
    })

    // Echo back
    void pipe(remote, remote)

    const bytes = randomBytes(1024)

    const results = await pipe(
      [bytes],
      local,
      async (source) => await toBuffer(source)
    )

    // Flush the call stack
    await delay(0)

    expect(results.length).to.equal(bytes.length)
    expect(metrics.getPeers()).to.be.empty()

    expect(metrics.forPeer(peerId)).to.equal(undefined)
    const snapshot = metrics.globalStats.getSnapshot()
    expect(snapshot.dataReceived).to.equal(0n)
    expect(snapshot.dataSent).to.equal(0n)
  })

  it('should be able to track a duplex stream', async () => {
    const [local, remote] = duplexPair<Uint8Array>()
    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 50
    })

    await metrics.start()

    metrics.trackStream({
      stream: local,
      remotePeer: peerId
    })

    // Echo back
    void pipe(remote, remote)

    const bytes = randomBytes(1024)
    const input = (async function * () {
      let i = 0
      while (i < 10) {
        await delay(10)
        yield bytes
        i++
      }
    })()

    const results = await pipe(
      input,
      local,
      async (source) => await toBuffer(source)
    )

    // Flush the call stack
    await delay(0)

    expect(results.length).to.eql(bytes.length * 10)
    expect(metrics.getPeers()).to.include(peerId.toString())

    const snapshot = metrics.forPeer(peerId)?.getSnapshot()
    expect(snapshot?.dataReceived).to.equal(BigInt(results.length))
    expect(snapshot?.dataSent).to.equal(BigInt(results.length))

    const globalSnapshot = metrics.globalStats.getSnapshot()
    expect(globalSnapshot.dataReceived).to.equal(BigInt(results.length))
    expect(globalSnapshot.dataSent).to.equal(BigInt(results.length))
  })

  it('should properly track global stats', async () => {
    const [local, remote] = duplexPair<Uint8Array>()
    const [local2, remote2] = duplexPair<Uint8Array>()
    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 50
    })
    const protocol = '/echo/1.0.0'
    await metrics.start()

    // Echo back remotes
    void pipe(remote, remote)
    void pipe(remote2, remote2)

    metrics.trackStream({
      stream: local,
      remotePeer: peerId,
      protocol
    })
    metrics.trackStream({
      stream: local2,
      remotePeer: peerId2,
      protocol
    })

    const bytes = randomBytes(1024)

    await Promise.all([
      pipe([bytes], local, drain),
      pipe([bytes], local2, drain)
    ])

    // Flush the call stack
    await delay(0)

    expect(metrics.getPeers()).to.eql([peerId.toString(), peerId2.toString()])
    // Verify global metrics
    const globalStats = metrics.globalStats.getSnapshot()
    expect(globalStats.dataReceived).to.equal(BigInt(bytes.length * 2))
    expect(globalStats.dataSent).to.equal(BigInt(bytes.length * 2))

    // Verify individual metrics
    for (const peer of [peerId, peerId2]) {
      const stats = metrics.forPeer(peer)?.getSnapshot()

      expect(stats?.dataReceived).to.equal(BigInt(bytes.length))
      expect(stats?.dataSent).to.equal(BigInt(bytes.length))
    }

    // Verify protocol metrics
    const protocolStats = metrics.forProtocol(protocol)?.getSnapshot()
    expect(metrics.getProtocols()).to.eql([protocol])
    expect(protocolStats?.dataReceived).to.equal(BigInt(bytes.length * 2))
    expect(protocolStats?.dataSent).to.equal(BigInt(bytes.length * 2))
  })

  it('should be able to replace an existing peer', async () => {
    const [local, remote] = duplexPair<Uint8Array>()
    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 50
    })
    await metrics.start()

    // Echo back remotes
    void pipe(remote, remote)

    const mockPeer = await createEd25519PeerId()

    metrics.trackStream({
      stream: local,
      remotePeer: mockPeer
    })

    const bytes = randomBytes(1024)
    const input = pushable<Uint8Array>()

    const deferredPromise = pipe(input, local, drain)

    input.push(bytes)

    await delay(0)

    metrics.updatePlaceholder(mockPeer, peerId)
    mockPeer.toString = peerId.toString.bind(peerId)

    input.push(bytes)
    input.end()

    await deferredPromise
    await delay(0)

    expect(metrics.getPeers()).to.eql([peerId.toString()])
    // Verify global metrics
    const globalStats = metrics.globalStats.getSnapshot()
    expect(globalStats.dataReceived).to.equal(BigInt(bytes.length * 2))
    expect(globalStats.dataSent).to.equal(BigInt(bytes.length * 2))

    // Verify individual metrics
    const stats = metrics.forPeer(peerId)?.getSnapshot()

    expect(stats?.dataReceived).to.equal(BigInt(bytes.length * 2))
    expect(stats?.dataSent).to.equal(BigInt(bytes.length * 2))
  })

  it.skip('should only keep track of a set number of disconnected peers', async () => {
    const spies: sinon.SinonSpy[] = []
    const peerIds = await Promise.all(
      new Array(50).fill(0).map(async () => await createEd25519PeerId())
    )

    const trackedPeers = new Map([...new Array(50)].fill(0).map((_, index) => {
      const stat = new DefaultStats({
        enabled: true,
        initialCounters: ['dataReceived', 'dataSent'],
        computeThrottleMaxQueueSize: 1000,
        computeThrottleTimeout: 5000,
        movingAverageIntervals: []
      })
      spies.push(sinon.spy(stat, 'stop'))
      return [peerIds[index].toString(), stat]
    }))

    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 5 // Only keep track of 5
    })

    // Disconnect every peer
    for (const id of trackedPeers.keys()) {
      metrics.onPeerDisconnected(peerIdFromString(id))
    }

    // Verify only the last 5 have been retained
    expect(metrics.getPeers()).to.have.length(0)
    const retainedPeers = []
    for (const id of trackedPeers.keys()) {
      const stat = metrics.forPeer(peerIdFromString(id))
      if (stat != null) retainedPeers.push(id)
    }
    expect(retainedPeers).to.eql(['45', '46', '47', '48', '49'])

    // Verify all stats were stopped
    expect(spies).to.have.length(50)
    for (const spy of spies) {
      expect(spy).to.have.property('callCount', 1)
    }
  })

  it('should allow components to track metrics', () => {
    const metrics = new DefaultMetrics({
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000],
      computeThrottleTimeout: 1000,
      maxOldPeersRetention: 50
    })

    expect(metrics.getComponentMetrics()).to.be.empty()

    const system = 'libp2p'
    const component = 'my-component'
    const metric = 'some-metric'
    const value = 1

    metrics.updateComponentMetric({ system, component, metric, value })

    expect(metrics.getComponentMetrics()).to.have.lengthOf(1)
    expect(metrics.getComponentMetrics().get('libp2p')?.get(component)).to.have.lengthOf(1)
    expect(metrics.getComponentMetrics().get('libp2p')?.get(component)?.get(metric)).to.equal(value)
  })
})
