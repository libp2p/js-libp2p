import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import type { Metrics } from '@libp2p/interface'

describe('simple-metrics', () => {
  let metrics: Metrics

  afterEach(async () => {
    if (metrics != null) {
      await stop(metrics)
    }
  })

  it('should retain metrics after stop', async () => {
    metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    await start(metrics)

    const m1 = metrics.registerCounterGroup('test_metric')
    const m2 = metrics.registerCounterGroup('test_metric')

    expect(m1).to.equal(m2, 'did not re-use metric')

    await stop(metrics)

    await start(metrics)

    const m3 = metrics.registerCounterGroup('test_metric')

    expect(m3).to.equal(m1, 'did not re-use metric')
  })
})
