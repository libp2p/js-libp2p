import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import client, { Registry } from 'prom-client'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('custom registry', () => {
  it('should set a metric in the custom registry and not in the global registry', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const registry = new Registry()
    const metrics = prometheusMetrics({ registry })()
    const metric = metrics.registerMetric(metricName)
    metric.update(metricValue)

    const customRegistryReport = await registry.metrics()
    expect(customRegistryReport).to.include(`# TYPE ${metricName} gauge`, 'did not include metric type')
    expect(customRegistryReport).to.include(`${metricName} ${metricValue}`, 'did not include updated metric')

    const globalRegistryReport = await client.register.metrics()
    expect(globalRegistryReport).to.not.include(`# TYPE ${metricName} gauge`, 'erroneously includes metric type')
    expect(globalRegistryReport).to.not.include(`${metricName} ${metricValue}`, 'erroneously includes updated metric')
  })
})
