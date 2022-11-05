import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import client from 'prom-client'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('metrics', () => {
  it('should set a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.update(metricValue)

    const report = await client.register.metrics()
    expect(report).to.include(`# TYPE ${metricName} gauge`, 'did not include metric type')
    expect(report).to.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should increment a metric without a value', async () => {
    const metricName = randomMetricName()
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.increment()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} 1`, 'did not include updated metric')
  })

  it('should increment a metric with a value', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.increment(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should decrement a metric without a value', async () => {
    const metricName = randomMetricName()
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.decrement()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} -1`, 'did not include updated metric')
  })

  it('should decrement a metric with a value', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.decrement(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} -${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerMetric(metricName, {
      calculate: () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerMetric(metricName, {
      calculate: async () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a metric', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerMetric(metricName)
    metric.update(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`)

    metric.reset()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} 0`, 'did not include updated metric')
  })
})
