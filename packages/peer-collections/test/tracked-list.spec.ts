import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { PeerList } from '../src/list.js'
import { trackedPeerList } from '../src/tracked-list.js'
import type { Metric, Metrics, PeerId } from '@libp2p/interface'
import type { SinonStubbedInstance } from 'sinon'

describe('tracked-peer-list', () => {
  let metrics: SinonStubbedInstance<Metrics>
  let peer1: PeerId
  let peer2: PeerId

  beforeEach(async () => {
    metrics = stubInterface<Metrics>()
    peer1 = await createEd25519PeerId()
    peer2 = await createEd25519PeerId()
  })

  it('should return a map with metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const list = trackedPeerList({
      name,
      metrics
    })

    expect(list).to.be.an.instanceOf(PeerList)
    expect(metrics.registerMetric.calledWith(name)).to.be.true()
  })

  it('should return a list without metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const list = trackedPeerList({
      name
    })

    expect(list).to.be.an.instanceOf(PeerList)
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

    const list = trackedPeerList({
      name,
      metrics
    })

    expect(list).to.be.an.instanceOf(PeerList)
    expect(callCount).to.equal(1)

    list.push(peer1)

    expect(value).to.equal(1)
    expect(callCount).to.equal(2)

    list.push(peer2)

    expect(value).to.equal(2)
    expect(callCount).to.equal(3)

    list.pop()

    expect(value).to.equal(1)
    expect(callCount).to.equal(4)

    list.clear()

    expect(value).to.equal(0)
    expect(callCount).to.equal(5)
  })
})
