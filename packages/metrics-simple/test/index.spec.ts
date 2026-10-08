import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { simpleMetrics } from '../src/index.ts'
import type { Metrics } from '@libp2p/interface'

describe('simple-metrics', () => {
  let s: Metrics

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

  it('should collect histogram buckets', async () => {
    const deferred = pDefer<Record<string, any>>()

    s = simpleMetrics({
      onMetrics: (metrics) => {
        deferred.resolve(metrics)
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    const histogram = s.registerHistogram('foo', {
      buckets: [1, 5, 10]
    })
    histogram.observe(3)

    const group = s.registerHistogramGroup('bar')
    group.observe({ baz: 3 })

    await start(s)

    const metrics = await deferred.promise

    expect(metrics.foo.buckets).to.deep.equal({
      1: 0,
      5: 1,
      10: 1,
      Infinity: 1
    })
    expect(metrics.bar.baz.buckets).to.deep.include({
      5: 1,
      10: 1,
      Infinity: 1
    })
  })

  it('should collect a calculated histogram group', async () => {
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

    s.registerHistogramGroup('foo', {
      calculate: () => ({
        a: 1,
        b: 2
      })
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.nested.property('foo.a.count', 1)
    expect(metrics).to.have.nested.property('foo.a.sum', 1)
    expect(metrics).to.have.nested.property('foo.b.count', 1)
    expect(metrics).to.have.nested.property('foo.b.sum', 2)
  })

  it('should collect a calculated summary group', async () => {
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

    s.registerSummaryGroup('foo', {
      calculate: () => ({
        a: 1,
        b: 2
      })
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.nested.property('foo.a.count', 1)
    expect(metrics).to.have.nested.property('foo.a.sum', 1)
    expect(metrics).to.have.nested.property('foo.b.count', 1)
    expect(metrics).to.have.nested.property('foo.b.sum', 2)
  })

  it('should collect calculated groups with an async calculate function', async () => {
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

    s.registerHistogramGroup('foo', {
      calculate: async () => ({
        a: 1
      })
    })
    s.registerSummaryGroup('bar', {
      calculate: async () => ({
        a: 1
      })
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.nested.property('foo.a.sum', 1)
    expect(metrics).to.have.nested.property('bar.a.sum', 1)
  })

  it('should observe calculated group values on every collection', async () => {
    const deferred = pDefer<Record<string, any>>()
    let collections = 0

    s = simpleMetrics({
      onMetrics: (metrics) => {
        collections++

        if (collections === 2) {
          deferred.resolve(metrics)
        }
      },
      intervalMs: 10
    })({
      logger: defaultLogger()
    })

    await start(s)

    s.registerHistogramGroup('foo', {
      calculate: () => ({
        a: 1
      })
    })
    s.registerSummaryGroup('bar', {
      calculate: () => ({
        a: 1
      })
    })

    const metrics = await deferred.promise
    expect(metrics).to.have.nested.property('foo.a.count', 2)
    expect(metrics).to.have.nested.property('foo.a.sum', 2)
    expect(metrics).to.have.nested.property('bar.a.count', 2)
    expect(metrics).to.have.nested.property('bar.a.sum', 2)
  })
})
