import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { PeerMap } from '../src/map.js'
import { trackedPeerMap } from '../src/tracked-map.js'
import type { Metric, Metrics, PeerId } from '@libp2p/interface'
import type { SinonStubbedInstance } from 'sinon'

describe('tracked-peer-map', () => {
  let metrics: SinonStubbedInstance<Metrics>
  let peer1: PeerId
  let peer2: PeerId

  beforeEach(async () => {
    metrics = stubInterface<Metrics>()
    peer1 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    peer2 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('should return a map with metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const map = trackedPeerMap({
      name,
      metrics
    })

    expect(map).to.be.an.instanceOf(PeerMap)
    expect(metrics.registerMetric.calledWith(name)).to.be.true()
  })

  it('should return a map without metrics', () => {
    const name = 'system_component_metric'
    const metric = stubInterface<Metric>()
    // @ts-expect-error the wrong overload is selected
    metrics.registerMetric.withArgs(name).returns(metric)

    const map = trackedPeerMap({
      name
    })

    expect(map).to.be.an.instanceOf(PeerMap)
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

    const map = trackedPeerMap({
      name,
      metrics
    })

    expect(map).to.be.an.instanceOf(PeerMap)
    expect(callCount).to.equal(1)

    map.set(peer1, 'value1')

    expect(value).to.equal(1)
    expect(callCount).to.equal(2)

    map.set(peer1, 'value2')

    expect(value).to.equal(1)
    expect(callCount).to.equal(3)

    map.set(peer2, 'value3')

    expect(value).to.equal(2)
    expect(callCount).to.equal(4)

    map.delete(peer2)

    expect(value).to.equal(1)
    expect(callCount).to.equal(5)

    map.clear()

    expect(value).to.equal(0)
    expect(callCount).to.equal(6)
  })
})
