import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { trackedList } from '../src/tracked-list.js'
import type { Metric, Metrics } from '@libp2p/interface'
import type { SinonStubbedInstance } from 'sinon'

describe('tracked-list', () => {
  let metrics: SinonStubbedInstance<Metrics>

  beforeEach(() => {
    metrics = stubInterface<Metrics>()
  })

  it('should return a list with metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const list = trackedList({
      name,
      metrics
    })

    expect(list).to.be.an.instanceOf(Array)
    expect(metrics.registerMetric.calledWith(name)).to.be.true()
  })

  it('should return a map without metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const list = trackedList({
      name
    })

    expect(list).to.be.an.instanceOf(Array)
    expect(metrics.registerMetric.called).to.be.false()
  })

  it('should track metrics', () => {
    const name = 'system_component_metric'

    const list = trackedList({
      name,
      metrics
    })

    const calculate = metrics.registerMetric.getCall(0).args[1].calculate

    expect(list).to.be.an.instanceOf(Array)
    expect(calculate()).to.equal(0)

    list.push('value1')

    expect(calculate()).to.equal(1)

    list.push('value2')

    expect(calculate()).to.equal(2)

    list.push('value3')

    expect(calculate()).to.equal(3)

    list.pop()

    expect(calculate()).to.equal(2)

    list.splice(0, list.length)

    expect(calculate()).to.equal(0)
  })
})
