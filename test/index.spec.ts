import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import client from 'prom-client'
import type { Connection } from '@libp2p/interface-connection'
import { connectionPair, mockRegistrar, mockMultiaddrConnPair } from '@libp2p/interface-mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { pipe } from 'it-pipe'
import drain from 'it-drain'
import defer from 'p-defer'
import { multiaddr } from '@multiformats/multiaddr'

/**
 * Prometheus metric names are global and can only contain
 * a limited set of, at least /a-z_0-9/i
 */
function randomMetricName (key = '') {
  return `my_metric_${key}${Math.random().toString().split('.').pop() ?? ''}`
}

describe('prometheus metrics', () => {
  beforeEach(() => {
    // Clear the register to make sure we're not registering multiple ones
    client.register.clear()
  })

  it('should set a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.update(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should increment a metric without a value', async () => {
    const metricName = randomMetricName()
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.increment()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} 1`, 'did not include updated metric')
  })

  it('should increment a metric with a value', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.increment(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should decrement a metric without a value', async () => {
    const metricName = randomMetricName()
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.decrement()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} -1`, 'did not include updated metric')
  })

  it('should decrement a metric with a value', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.decrement(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} -${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerMetric(metricName, {
      calculate: () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerMetric(metricName, {
      calculate: async () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.update(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`)

    metric.reset()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} 0`, 'did not include updated metric')
  })

  describe('groups', () => {
    it('should set a metric group', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.update({
        [metricKey]: metricValue
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
    })

    it('should increment a metric group without a value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.increment({
        [metricKey]: false
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} 1`, 'did not include updated metric')
    })

    it('should increment a metric group with a value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.increment({
        [metricKey]: metricValue
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
    })

    it('should decrement a metric group without a value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.decrement({
        [metricKey]: false
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} -1`, 'did not include updated metric')
    })

    it('should decrement a metric group with a value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.decrement({
        [metricKey]: metricValue
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} -${metricValue}`, 'did not include updated metric')
    })

    it('should calculate a metric group value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      metrics.registerMetricGroup(metricName, {
        label: metricLabel,
        calculate: () => {
          return {
            [metricKey]: metricValue
          }
        }
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
    })

    it('should promise to calculate a metric group value', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      metrics.registerMetricGroup(metricName, {
        label: metricLabel,
        calculate: async () => {
          return {
            [metricKey]: metricValue
          }
        }
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
    })

    it('should reset a metric group', async () => {
      const metricName = randomMetricName()
      const metricKey = randomMetricName('key_')
      const metricLabel = randomMetricName('label_')
      const metricValue = 5
      const metrics = prometheusMetrics()()
      const metric = metrics.registerMetricGroup(metricName, {
        label: metricLabel
      })
      metric.update({
        [metricKey]: metricValue
      })

      await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')

      metric.reset()

      await expect(client.register.metrics()).to.eventually.not.include(metricKey, 'still included metric key')
    })
  })

  describe('streams', () => {
    let connectionA: Connection
    let connectionB: Connection

    afterEach(async () => {
      if (connectionA != null) {
        await connectionA.close()
      }

      if (connectionB != null) {
        await connectionB.close()
      }
    })

    it('should track bytes sent over connections', async () => {
      const deferred = defer()
      const remotePeer = await createEd25519PeerId()

      const { outbound, inbound } = mockMultiaddrConnPair({
        addrs: [
          multiaddr('/ip4/123.123.123.123/tcp/5923'),
          multiaddr('/ip4/123.123.123.123/tcp/5924')
        ],
        remotePeer
      })

      // process all the bytes
      void pipe(inbound, drain).then(() => {
        deferred.resolve()
      })

      const metrics = prometheusMetrics()()

      // track outgoing stream
      metrics.trackMultiaddrConnection(outbound)

      // send data to the remote over the tracked stream
      const data = Uint8Array.from([0, 1, 2, 3, 4])
      await outbound.sink([
        data
      ])

      // wait for all bytes to be received
      await deferred.promise

      const scrapedMetrics = await client.register.metrics()
      expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="global sent"} ${data.length}`)
    })

    it('should track bytes received over connections', async () => {
      const deferred = defer()
      const remotePeer = await createEd25519PeerId()

      const { outbound, inbound } = mockMultiaddrConnPair({
        addrs: [
          multiaddr('/ip4/123.123.123.123/tcp/5923'),
          multiaddr('/ip4/123.123.123.123/tcp/5924')
        ],
        remotePeer
      })

      const metrics = prometheusMetrics()()

      // track incoming stream
      metrics.trackMultiaddrConnection(inbound)

      // send data to the remote over the tracked stream
      const data = Uint8Array.from([0, 1, 2, 3, 4])
      await outbound.sink([
        data
      ])

      // process all the bytes
      void pipe(inbound, drain).then(() => {
        deferred.resolve()
      })

      // wait for all bytes to be received
      await deferred.promise

      const scrapedMetrics = await client.register.metrics()
      expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="global received"} ${data.length}`)
    })

    it('should track sent stream metrics', async () => {
      const protocol = '/my-protocol-send/1.0.0'
      const peerA = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }
      const peerB = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }
      await peerB.registrar.handle(protocol, ({ stream }) => {
        void pipe(stream, drain)
      })

      ;[connectionA, connectionB] = connectionPair(peerA, peerB)
      const aToB = await connectionA.newStream(protocol)

      const metrics = prometheusMetrics()()

      // track outgoing stream
      metrics.trackProtocolStream(aToB, connectionA)

      // send data to the remote over the tracked stream
      const data = Uint8Array.from([0, 1, 2, 3, 4])
      await aToB.sink([
        data
      ])

      const scrapedMetrics = await client.register.metrics()
      expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${protocol} sent"} ${data.length}`)
    })

    it('should track sent received metrics', async () => {
      const deferred = defer()
      const protocol = '/my-protocol-receive/1.0.0'
      const peerA = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }
      await peerA.registrar.handle(protocol, ({ stream, connection }) => {
        // track incoming stream
        metrics.trackProtocolStream(stream, connectionA)

        // ignore data
        void pipe(stream, drain).then(() => {
          deferred.resolve()
        })
      })
      const peerB = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }

      const metrics = prometheusMetrics()()

      ;[connectionA, connectionB] = connectionPair(peerA, peerB)

      const bToA = await connectionB.newStream(protocol)

      // send data from remote to local
      const data = Uint8Array.from([0, 1, 2, 3, 4])
      await bToA.sink([
        data
      ])

      // wait for data to have been transferred
      await deferred.promise

      const scrapedMetrics = await client.register.metrics()
      expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${protocol} received"} ${data.length}`)
    })
  })
})
