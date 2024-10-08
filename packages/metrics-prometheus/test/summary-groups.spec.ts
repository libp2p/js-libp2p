import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import client from 'prom-client'
import { prometheusMetrics } from '../src/index.js'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('summary groups', () => {
  it('should set a summary group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerSummaryGroup(metricName, {
      label: metricLabel
    })
    metric.observe({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a summary group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerSummaryGroup(metricName, {
      label: metricLabel,
      calculate: () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a summary group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerSummaryGroup(metricName, {
      label: metricLabel,
      calculate: async () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a summary group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerSummaryGroup(metricName, {
      label: metricLabel
    })
    metric.observe({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')

    metric.reset()

    await expect(client.register.metrics()).to.eventually.include(`${metricName}_sum{${metricLabel}="${metricKey}"} 0`, 'did not include updated metric')
  })

  it('should allow use of the same summary group from multiple reporters', async () => {
    const metricName = randomMetricName()
    const metricKey1 = randomMetricName('key_')
    const metricKey2 = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue1 = 5
    const metricValue2 = 7
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric1 = metrics.registerSummaryGroup(metricName, {
      label: metricLabel
    })
    metric1.observe({
      [metricKey1]: metricValue1
    })
    const metric2 = metrics.registerSummaryGroup(metricName, {
      label: metricLabel
    })
    metric2.observe({
      [metricKey2]: metricValue2
    })

    const reportedMetrics = await client.register.metrics()

    expect(reportedMetrics).to.include(`${metricName}_sum{${metricLabel}="${metricKey1}"} ${metricValue1}`, 'did not include updated metric')
    expect(reportedMetrics).to.include(`${metricName}_sum{${metricLabel}="${metricKey2}"} ${metricValue2}`, 'did not include updated metric')
  })
})
