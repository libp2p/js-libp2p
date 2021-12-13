'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { randomBytes } = require('libp2p-crypto')
const duplexPair = require('it-pair/duplex')
const pipe = require('it-pipe')
const concat = require('it-concat')
const pushable = require('it-pushable')
const { consume } = require('streaming-iterables')
const delay = require('delay')

const Metrics = require('../../src/metrics')
const Stats = require('../../src/metrics/stats')
const { createPeerId } = require('../utils/creators/peer')

describe('Metrics', () => {
  let peerId
  let peerId2

  before(async () => {
    [peerId, peerId2] = await createPeerId({ number: 2 })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should not track data if not started', async () => {
    const [local, remote] = duplexPair()
    const metrics = new Metrics({
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000]
    })

    metrics.trackStream({
      stream: local,
      remotePeer: peerId
    })

    // Echo back
    pipe(remote, remote)

    const bytes = randomBytes(1024)

    const results = await pipe(
      [bytes],
      local,
      concat
    )

    // Flush the call stack
    await delay(0)

    expect(results.length).to.eql(bytes.length)

    expect(metrics.forPeer(peerId)).to.equal(undefined)
    expect(metrics.peers).to.eql([])
    const globalStats = metrics.global
    expect(globalStats.snapshot.dataReceived.toNumber()).to.equal(0)
    expect(globalStats.snapshot.dataSent.toNumber()).to.equal(0)
  })

  it('should be able to track a duplex stream', async () => {
    const [local, remote] = duplexPair()
    const metrics = new Metrics({
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000]
    })

    metrics.trackStream({
      stream: local,
      remotePeer: peerId
    })
    metrics.start()

    // Echo back
    pipe(remote, remote)

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
      concat
    )

    // Flush the call stack
    await delay(0)

    expect(results.length).to.eql(bytes.length * 10)

    const stats = metrics.forPeer(peerId)
    expect(metrics.peers).to.eql([peerId.toB58String()])
    expect(stats.snapshot.dataReceived.toNumber()).to.equal(results.length)
    expect(stats.snapshot.dataSent.toNumber()).to.equal(results.length)

    const globalStats = metrics.global
    expect(globalStats.snapshot.dataReceived.toNumber()).to.equal(results.length)
    expect(globalStats.snapshot.dataSent.toNumber()).to.equal(results.length)
  })

  it('should properly track global stats', async () => {
    const [local, remote] = duplexPair()
    const [local2, remote2] = duplexPair()
    const metrics = new Metrics({
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000]
    })
    const protocol = '/echo/1.0.0'
    metrics.start()

    // Echo back remotes
    pipe(remote, remote)
    pipe(remote2, remote2)

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
      pipe([bytes], local, consume),
      pipe([bytes], local2, consume)
    ])

    // Flush the call stack
    await delay(0)

    expect(metrics.peers).to.eql([peerId.toB58String(), peerId2.toB58String()])
    // Verify global metrics
    const globalStats = metrics.global
    expect(globalStats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(globalStats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)

    // Verify individual metrics
    for (const peer of [peerId, peerId2]) {
      const stats = metrics.forPeer(peer)

      expect(stats.snapshot.dataReceived.toNumber()).to.equal(bytes.length)
      expect(stats.snapshot.dataSent.toNumber()).to.equal(bytes.length)
    }

    // Verify protocol metrics
    const protocolStats = metrics.forProtocol(protocol)
    expect(metrics.protocols).to.eql([protocol])
    expect(protocolStats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(protocolStats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)
  })

  it('should be able to replace an existing peer', async () => {
    const [local, remote] = duplexPair()
    const metrics = new Metrics({
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10, 100, 1000]
    })
    metrics.start()

    // Echo back remotes
    pipe(remote, remote)

    const mockPeer = {
      toB58String: () => 'a temporary id'
    }
    metrics.trackStream({
      stream: local,
      remotePeer: mockPeer
    })

    const bytes = randomBytes(1024)
    const input = pushable()

    const deferredPromise = pipe(input, local, consume)

    input.push(bytes)

    await delay(0)

    metrics.updatePlaceholder(mockPeer, peerId)
    mockPeer.toB58String = peerId.toB58String.bind(peerId)

    input.push(bytes)
    input.end()

    await deferredPromise
    await delay(0)

    expect(metrics.peers).to.eql([peerId.toB58String()])
    // Verify global metrics
    const globalStats = metrics.global
    expect(globalStats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(globalStats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)

    // Verify individual metrics
    const stats = metrics.forPeer(peerId)

    expect(stats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(stats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)
  })

  it('should only keep track of a set number of disconnected peers', () => {
    const spies = []
    const trackedPeers = new Map([...new Array(50)].map((_, index) => {
      const stat = new Stats([], { movingAverageIntervals: [] })
      spies.push(sinon.spy(stat, 'stop'))
      return [String(index), stat]
    }))

    const metrics = new Metrics({
      maxOldPeersRetention: 5 // Only keep track of 5
    })

    // Clone so trackedPeers isn't modified
    metrics._peerStats = new Map(trackedPeers)

    // Disconnect every peer
    for (const id of trackedPeers.keys()) {
      metrics.onPeerDisconnected({
        toB58String: () => id
      })
    }

    // Verify only the last 5 have been retained
    expect(metrics.peers).to.have.length(0)
    const retainedPeers = []
    for (const id of trackedPeers.keys()) {
      const stat = metrics.forPeer({
        toB58String: () => id
      })
      if (stat) retainedPeers.push(id)
    }
    expect(retainedPeers).to.eql(['45', '46', '47', '48', '49'])

    // Verify all stats were stopped
    expect(spies).to.have.length(50)
    for (const spy of spies) {
      expect(spy).to.have.property('callCount', 1)
    }
  })

  it('should allow components to track metrics', () => {
    const metrics = new Metrics({
      maxOldPeersRetention: 5 // Only keep track of 5
    })

    expect(metrics.getComponentMetrics()).to.be.empty()

    const component = 'my-component'
    const metric = 'some-metric'
    const value = 1

    metrics.updateMetric(component, metric, value)

    expect(metrics.getComponentMetrics()).to.have.lengthOf(1)
    expect(metrics.getComponentMetrics().get(component)).to.have.lengthOf(1)
    expect(metrics.getComponentMetrics().get(component).get(metric)).to.equal(value)
  })
})
