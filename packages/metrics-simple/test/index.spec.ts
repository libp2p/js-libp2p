import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { pEvent } from 'p-event'
import { simpleMetrics } from '../src/index.js'

describe('simple-metrics', () => {
  let s: import('@libp2p/interface').Metrics

  afterEach(async () => {
    if (s != null) {
      await stop(s)
    }
  })

  it('should invoke the onMetrics callback', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const metrics = await deferred.promise
    expect(metrics).to.be.ok()
  })

  it('should not allow altering internal state', async () => {
    const deferred = pDefer()
    const list: Array<Record<string, any>> = []

    s = simpleMetrics({
      onMetrics: (metrics) => {
        list.push(metrics)

        if (list.length === 2) {
          deferred.resolve()
        }
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    const group = s.registerMetricGroup('foo')
    group.update({ bar: 5 })

    await start(s)

    await deferred.promise

    list[0].foo.baz = 'qux'

    expect(list).to.not.have.nested.property('[1].foo.baz')
  })

  it('should create a metric', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const m = s.registerMetric('test_metric')
    m.update(10)

    const metrics = await deferred.promise
    expect(metrics).to.have.property('test_metric', 10)
  })

  it('should create a counter metric', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const m = s.registerCounter('test_metric')
    m.increment()

    const metrics = await deferred.promise
    expect(metrics).to.have.property('test_metric', 1)
  })

  it('should create a metric group', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const m = s.registerMetricGroup('test_metric')
    m.update({
      foo: 10,
      bar: 20
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.deep.property('test_metric', {
      foo: 10,
      bar: 20
    })
  })

  it('should create a metric counter group', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const m = s.registerCounterGroup('test_metric')
    m.increment({
      foo: 10,
      bar: 20
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.deep.property('test_metric', {
      foo: 10,
      bar: 20
    })
  })

  it('should track bytes received over outbound streams and not consume early frames', async () => {
    const data = Uint8Array.from([9, 8, 7, 6, 5])
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        const value = metrics.libp2p_data_transfer_bytes_total?.['/echo/1.0.0 received']

        if (value === data.length) {
          deferred.resolve(metrics)
        }
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const [outbound, inbound] = await streamPair({
      protocol: '/echo/1.0.0'
    })

    s.trackProtocolStream(outbound)

    // Send before app-level iterator is attached
    inbound.send(data)
    await new Promise((resolve) => setTimeout(resolve, 25))

    const iterator = outbound[Symbol.asyncIterator]()
    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('timed out waiting for first frame')), 200))
    ])

    expect(first.done).to.equal(false)
    expect(first.value?.byteLength).to.equal(data.length)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const metrics = await deferred.promise
    expect(metrics.libp2p_data_transfer_bytes_total?.['/echo/1.0.0 received']).to.equal(data.length)
  })

  it('should track bytes received over outbound connections', async () => {
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        const value = metrics.libp2p_data_transfer_bytes_total?.['global received']

        if (value === data.length) {
          deferred.resolve(metrics)
        }
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const [outbound, inbound] = multiaddrConnectionPair()

    s.trackMultiaddrConnection(outbound)

    const iterator = outbound[Symbol.asyncIterator]()
    inbound.send(data)

    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('timed out waiting for first frame')), 200))
    ])

    expect(first.done).to.equal(false)
    expect(first.value?.byteLength).to.equal(data.length)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const metrics = await deferred.promise
    expect(metrics.libp2p_data_transfer_bytes_total?.['global received']).to.equal(data.length)
  })

  it('should retain metrics after stop', async () => {
    s = simpleMetrics({
      onMetrics: (metrics) => {

      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    const m1 = s.registerCounterGroup('test_metric')
    const m2 = s.registerCounterGroup('test_metric')

    expect(m1).to.equal(m2, 'did not re-use metric')

    await stop(s)

    await start(s)

    const m3 = s.registerCounterGroup('test_metric')

    expect(m3).to.equal(m1, 'did not re-use metric')
  })
})
