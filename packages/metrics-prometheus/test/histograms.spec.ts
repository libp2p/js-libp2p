import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import client from 'prom-client'
import { prometheusMetrics } from '../src/index.js'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('histograms', () => {
  it('should set a histogram', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerHistogram(metricName)
    metric.observe(metricValue)

    const report = await client.register.metrics()
    expect(report).to.include(`# TYPE ${metricName} histogram`, 'did not include metric type')
    expect(report).to.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a histogram', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerHistogram(metricName, {
      calculate: () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a histogram', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerHistogram(metricName, {
      calculate: async () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a histogram', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerHistogram(metricName)
    metric.observe(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue}`)

    metric.reset()

    await expect(client.register.metrics()).to.eventually.not.include(`${metricName}_sum`, 'did not include updated metric')
  })

  it('should allow use of the same histogram from multiple reporters', async () => {
    const metricName = randomMetricName()
    const metricLabel = randomMetricName('label_')
    const metricValue1 = 5
    const metricValue2 = 7
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric1 = metrics.registerHistogram(metricName, {
      label: metricLabel
    })
    metric1.observe(metricValue1)
    const metric2 = metrics.registerHistogram(metricName, {
      label: metricLabel
    })
    metric2.observe(metricValue2)

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum ${metricValue1 + metricValue2}`)
  })
})
