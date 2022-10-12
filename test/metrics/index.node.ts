/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { randomBytes } from '@libp2p/crypto'
import { pipe } from 'it-pipe'
import toBuffer from 'it-to-buffer'
import delay from 'delay'
import { createNode, populateAddressBooks } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import type { Libp2pOptions } from '../../src/index.js'
import type { DefaultMetrics } from '../../src/metrics/index.js'
import pWaitFor from 'p-wait-for'
import drain from 'it-drain'
import map from 'it-map'

describe('libp2p.metrics', () => {
  let libp2p: Libp2pNode
  let remoteLibp2p: Libp2pNode

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should disable metrics by default', async () => {
    libp2p = await createNode({
      config: createBaseOptions()
    })

    expect(libp2p.metrics).to.be.undefined()
  })

  it('should start/stop metrics on startup/shutdown when enabled', async () => {
    const config: Libp2pOptions = createBaseOptions({
      metrics: {
        enabled: true,
        computeThrottleMaxQueueSize: 1, // compute after every message
        movingAverageIntervals: [10]
      }
    })
    libp2p = await createNode({ started: false, config })

    const metrics = libp2p.metrics as DefaultMetrics

    if (metrics == null) {
      throw new Error('Metrics not configured')
    }

    const metricsStartSpy = sinon.spy(metrics, 'start')
    const metricsStopSpy = sinon.spy(metrics, 'stop')

    await libp2p.start()
    expect(metricsStartSpy).to.have.property('callCount', 1)

    await libp2p.stop()
    expect(metricsStopSpy).to.have.property('callCount', 1)
  })

  it('should record metrics on connections and streams when enabled', async () => {
    [libp2p, remoteLibp2p] = await Promise.all([
      createNode({
        config: createBaseOptions({
          metrics: {
            enabled: true,
            computeThrottleMaxQueueSize: 1, // compute after every message
            movingAverageIntervals: [10]
          }
        })
      }),
      createNode({
        config: createBaseOptions({
          metrics: {
            enabled: true,
            computeThrottleMaxQueueSize: 1, // compute after every message
            movingAverageIntervals: [10]
          }
        })
      })
    ])

    await populateAddressBooks([libp2p, remoteLibp2p])

    void remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    })

    const connection = await libp2p.dial(remoteLibp2p.peerId)
    const stream = await connection.newStream('/echo/1.0.0')

    const bytes = randomBytes(512)
    const result = await pipe(
      [bytes],
      stream,
      async (source) => await toBuffer(map(source, (list) => list.subarray()))
    )

    // Flush the call stack
    await delay(0)

    expect(result).to.have.length(bytes.length)

    const metrics = libp2p.metrics

    if (metrics == null) {
      throw new Error('Metrics not configured')
    }

    // Protocol stats should equal the echo size
    const protocolStats = metrics.forProtocol('/echo/1.0.0')?.getSnapshot()
    expect(protocolStats?.dataReceived).to.equal(BigInt(bytes.length))
    expect(protocolStats?.dataSent).to.equal(BigInt(bytes.length))

    // A lot more traffic will be sent over the wire for the peer
    const peerStats = metrics.forPeer(connection.remotePeer)?.getSnapshot()
    expect(parseInt(peerStats?.dataReceived.toString() ?? '0')).to.be.at.least(bytes.length)
    await remoteLibp2p.stop()
  })

  it('should move disconnected peers to the old peers list', async () => {
    [libp2p, remoteLibp2p] = await Promise.all([
      createNode({
        config: createBaseOptions({
          metrics: {
            enabled: true,
            computeThrottleMaxQueueSize: 1, // compute after every message
            movingAverageIntervals: [10]
          },
          connectionManager: {
            autoDial: false
          }
        })
      }),
      createNode({
        config: createBaseOptions({
          metrics: {
            enabled: true,
            computeThrottleMaxQueueSize: 1, // compute after every message
            movingAverageIntervals: [10]
          },
          connectionManager: {
            autoDial: false
          }
        })
      })
    ])
    await populateAddressBooks([libp2p, remoteLibp2p])

    await remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    })

    const connection = await libp2p.dial(remoteLibp2p.peerId)
    const stream = await connection.newStream('/echo/1.0.0')

    const bytes = randomBytes(512)
    await pipe(
      [bytes],
      stream,
      drain
    )

    const metrics = libp2p.metrics

    if (metrics == null) {
      throw new Error('Metrics not configured')
    }

    await pWaitFor(() => {
      const peerStats = metrics.forPeer(connection.remotePeer)?.getSnapshot()
      const transferred = parseInt(peerStats?.dataReceived.toString() ?? '0')

      if (transferred < bytes.length) {
        return false
      }

      return true
    }, {
      interval: 100
    })

    const peerStats = metrics.forPeer(connection.remotePeer)?.getSnapshot()
    expect(parseInt(peerStats?.dataReceived.toString() ?? '0')).to.be.at.least(bytes.length)

    const metricsOnPeerDisconnectedSpy = sinon.spy(metrics, 'onPeerDisconnected')
    await libp2p.hangUp(connection.remotePeer)

    // Flush call stack
    await delay(0)

    expect(metricsOnPeerDisconnectedSpy).to.have.property('callCount', 1)

    // forPeer should still give us the old peer stats,
    // even though its not in the active peer list
    const peerStatsAfterHangup = metrics.forPeer(connection.remotePeer)?.getSnapshot()
    expect(parseInt(peerStatsAfterHangup?.dataReceived.toString() ?? '0')).to.be.at.least(bytes.length)

    await remoteLibp2p.stop()
  })
})
