import { expect } from 'aegir/chai'
import { trackedMap } from '../src/index.js'
import type { SinonStubbedInstance } from 'sinon'
import type { Metric, Metrics } from '@libp2p/interface-metrics'
import { stubInterface } from 'sinon-ts'

describe('tracked-map', () => {
  let metrics: SinonStubbedInstance<Metrics>

  beforeEach(() => {
    metrics = stubInterface<Metrics>()
  })

  it('should return a map with metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const map = trackedMap({
      name,
      metrics
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(metrics.registerMetric.calledWith(name)).to.be.true()
  })

  it('should return a map without metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const map = trackedMap({
      name
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(metrics.registerMetric.called).to.be.false()
  })

  it('should track metrics', () => {
    const name = 'system_component_metric'
    let value = 0
    let callCount = 0

    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    metric.update.callsFake((v) => {
      if (typeof v === 'number') {
        value = v
      }

      callCount++
    })

    const map = trackedMap({
      name,
      metrics
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(callCount).to.equal(1)

    map.set('key1', 'value1')

    expect(value).to.equal(1)
    expect(callCount).to.equal(2)

    map.set('key1', 'value2')

    expect(value).to.equal(1)
    expect(callCount).to.equal(3)

    map.set('key2', 'value3')

    expect(value).to.equal(2)
    expect(callCount).to.equal(4)

    map.delete('key2')

    expect(value).to.equal(1)
    expect(callCount).to.equal(5)

    map.clear()

    expect(value).to.equal(0)
    expect(callCount).to.equal(6)
  })
})
