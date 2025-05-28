import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { openTelemetryMetrics } from '../src/index.js'

describe('opentelemetry-metrics', () => {
  it('should wrap a method', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    const target = {
      wrapped: function () {

      }
    }

    const wrapped = metrics.traceFunction('target.wrapped', target.wrapped, {
      optionsIndex: 0
    })

    expect(wrapped).to.not.equal(target.wrapped)
  })

  it('should not retain metrics after stop', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    await start(metrics)

    const m1 = metrics.registerCounterGroup('test_metric')
    const m2 = metrics.registerCounterGroup('test_metric')

    expect(m1).to.equal(m2, 'did not re-use metric')

    await stop(metrics)

    await start(metrics)

    const m3 = metrics.registerCounterGroup('test_metric')

    expect(m3).to.not.equal(m1, 're-used metric')
  })
})
