import { expect } from 'aegir/chai'
import { trackedMap } from '../src/index.js'
import sinon from 'sinon'
import type { ComponentMetricsTracker, ComponentMetricsUpdate } from '@libp2p/interface-metrics'
import type { SinonStub } from 'sinon'

describe('tracked-map', () => {
  let metrics: ComponentMetricsTracker
  let updateComponentMetricStub: SinonStub<[ComponentMetricsUpdate], void>

  beforeEach(() => {
    updateComponentMetricStub = sinon.stub()

    metrics = {
      updateComponentMetric: updateComponentMetricStub,
      getComponentMetrics: sinon.stub()
    }
  })

  it('should return a map with metrics', () => {
    const system = 'system'
    const component = 'component'
    const metric = 'metric'

    const map = trackedMap({
      metrics,
      system,
      component,
      metric
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(updateComponentMetricStub.calledWith({
      system,
      component,
      metric,
      value: 0
    })).to.be.true()
  })

  it('should return a map without metrics', () => {
    const system = 'system'
    const component = 'component'
    const metric = 'metric'

    const map = trackedMap({
      system,
      component,
      metric
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(updateComponentMetricStub.called).to.be.false()
  })

  it('should default system to libp2p', () => {
    const component = 'component'
    const metric = 'metric'

    const map = trackedMap({
      metrics,
      component,
      metric
    })

    expect(map).to.be.an.instanceOf(Map)
    expect(updateComponentMetricStub.calledWith({
      system: 'libp2p',
      component,
      metric,
      value: 0
    })).to.be.true()
  })

  it('should track metrics', () => {
    const system = 'system'
    const component = 'component'
    const metric = 'metric'
    let value = 0
    let callCount = 0

    metrics.updateComponentMetric = (data) => {
      expect(data.system).to.equal(system)
      expect(data.component).to.equal(component)
      expect(data.metric).to.equal(metric)
      value = data.value
      callCount++
    }

    const map = trackedMap({
      metrics,
      system,
      component,
      metric
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
