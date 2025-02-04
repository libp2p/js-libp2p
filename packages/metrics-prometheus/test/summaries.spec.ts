import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import client from 'prom-client'
import { prometheusMetrics } from '../src/index.js'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('summaries', () => {
  it('should set a summary', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerSummary(metricName)
    metric.observe(metricValue)

    const report = await client.register.metrics()
    expect(report).to.include(`# TYPE ${metricName} summary`, 'did not include metric type')
    expect(report).to.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a summary', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerSummary(metricName, {
      calculate: () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a summary', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerSummary(metricName, {
      calculate: async () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a summary', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerSummary(metricName)
    metric.observe(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`)

    metric.reset()

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum 0`, 'did not include updated metric')
  })

  it('should allow use of the same summary from multiple reporters', async () => {
    const metricName = randomMetricName()
    const metricLabel = randomMetricName('label_')
    const metricValue1 = 5
    const metricValue2 = 7
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric1 = metrics.registerSummary(metricName, {
      label: metricLabel
    })
    metric1.observe(metricValue1)
    const metric2 = metrics.registerSummary(metricName, {
      label: metricLabel
    })
    metric2.observe(metricValue2)

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue1 + metricValue2}`)
  })
})
