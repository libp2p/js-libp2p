import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import client from 'prom-client'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('counters', () => {
  it('should set a counter', async () => {
    const metricName = randomMetricName()
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounter(metricName)
    metric.increment()

    const report = await client.register.metrics()
    expect(report).to.include(`# TYPE ${metricName} counter`, 'did not include metric type')
    expect(report).to.include(`${metricName} 1`, 'did not include updated metric')
  })

  it('should increment a counter with a value', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounter(metricName)
    metric.increment(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a counter', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerCounter(metricName, {
      calculate: () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a counter', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerCounter(metricName, {
      calculate: async () => {
        return metricValue
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a counter', async () => {
    const metricName = randomMetricName()
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounter(metricName)
    metric.increment(metricValue)

    await expect(client.register.metrics()).to.eventually.include(`${metricName} ${metricValue}`)

    metric.reset()

    await expect(client.register.metrics()).to.eventually.include(`${metricName} 0`, 'did not include updated metric')
  })
})
