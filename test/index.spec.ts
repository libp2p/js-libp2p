import { start, stop } from '@libp2p/interface/startable'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { simpleMetrics } from '../src/index.js'
import type { Metrics } from '@libp2p/interface/src/metrics'

describe('simple-metrics', () => {
  let s: Metrics

  afterEach(async () => {
    if (s != null) {
      await stop(s)
    }
  })

  it('should invoke the onMetrics callback', async () => {
    const deferred = pDefer()

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
})
