import { expect } from 'aegir/chai'
import { openTelemetryMetrics } from '../src/index.js'

describe('opentelemetry-metrics', () => {
  it('should wrap a method', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0'
      }
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
})
