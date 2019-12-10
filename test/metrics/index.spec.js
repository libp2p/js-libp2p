'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const { randomBytes } = require('libp2p-crypto')
const duplexPair = require('it-pair/duplex')
const pipe = require('it-pipe')
const concat = require('it-concat')
const pushable = require('it-pushable')
const { consume } = require('streaming-iterables')
const delay = require('delay')

const { MULTIADDRS_WEBSOCKETS: remoteAddrs } = require('../fixtures/browser')
const Metrics = require('../../src/metrics')
const { createPeerId, createPeer } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options.browser')

describe('Metrics', () => {
  let peerId
  let peerId2

  before(async () => {
    [peerId, peerId2] = await createPeerId({ number: 2, fixture: true })
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
    expect(metrics.peers).to.eql([peerId.toString()])
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
    metrics.start()

    // Echo back remotes
    pipe(remote, remote)
    pipe(remote2, remote2)

    metrics.trackStream({
      stream: local,
      remotePeer: peerId
    })
    metrics.trackStream({
      stream: local2,
      remotePeer: peerId2
    })

    const bytes = randomBytes(1024)

    await Promise.all([
      pipe([bytes], local, consume),
      pipe([bytes], local2, consume)
    ])

    // Flush the call stack
    await delay(0)

    expect(metrics.peers).to.eql([peerId.toString(), peerId2.toString()])
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
      toString: () => 'a temporary id'
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

    metrics.updatePlaceholder(mockPeer.toString(), peerId)
    mockPeer.toString = peerId.toString.bind(peerId)

    input.push(bytes)
    input.end()

    await deferredPromise
    await delay(0)

    expect(metrics.peers).to.eql([peerId.toString()])
    // Verify global metrics
    const globalStats = metrics.global
    expect(globalStats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(globalStats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)

    // Verify individual metrics
    const stats = metrics.forPeer(peerId)

    expect(stats.snapshot.dataReceived.toNumber()).to.equal(bytes.length * 2)
    expect(stats.snapshot.dataSent.toNumber()).to.equal(bytes.length * 2)
  })

  describe('libp2p.metrics', () => {
    let libp2p

    afterEach(async () => {
      libp2p && await libp2p.stop()
    })

    it('should disable metrics by default', async () => {
      [libp2p] = await createPeer({
        config: {
          modules: baseOptions.modules
        }
      })

      expect(libp2p.metrics).to.not.exist()
    })

    it('should start/stop metrics on startup/shutdown when enabled', async () => {
      const config = { ...baseOptions }
      config.metrics = {
        enabled: true
      }
      ;[libp2p] = await createPeer({ config })

      expect(libp2p.metrics).to.exist()
      sinon.spy(libp2p.metrics, 'start')
      sinon.spy(libp2p.metrics, 'stop')

      await libp2p.start()
      expect(libp2p.metrics.start).to.have.property('callCount', 1)

      await libp2p.stop()
      expect(libp2p.metrics.stop).to.have.property('callCount', 1)
    })

    it('should record metrics on connections and streams when enabled', async () => {
      const config = { ...baseOptions }
      config.metrics = {
        enabled: true,
        computeThrottleMaxQueueSize: 1, // compute after every message
        movingAverageIntervals: [10]
      }
      ;[libp2p] = await createPeer({ config })

      await libp2p.start()
      const connection = await libp2p.dial(remoteAddrs[0])
      const { stream } = await connection.newStream('/echo/1.0.0')

      const bytes = randomBytes(512)
      const result = await pipe(
        [bytes],
        stream,
        concat
      )

      // Flush the call stack
      await delay(0)

      expect(result).to.have.length(bytes.length)
      // Protocol stats should equal the echo size
      const protocolStats = libp2p.metrics.forProtocol('/echo/1.0.0').toJSON()
      expect(Number(protocolStats.dataReceived)).to.equal(bytes.length)
      expect(Number(protocolStats.dataSent)).to.equal(bytes.length)

      // A lot more traffic will be sent over the wire for the peer
      const peerStats = libp2p.metrics.forPeer(connection.remotePeer).toJSON()
      expect(Number(peerStats.dataReceived)).to.be.at.least(bytes.length)
      await libp2p.stop()
    })
  })
})
