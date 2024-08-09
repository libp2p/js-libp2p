import { start, stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { simpleMetrics } from '../src/index.js'
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
    })({})

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
    })({})

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
    })({})

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
    })({})

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
    })({})

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
    })({})

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
})
