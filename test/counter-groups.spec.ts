import { expect } from 'aegir/chai'
import { prometheusMetrics } from '../src/index.js'
import client from 'prom-client'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('counter groups', () => {
  it('should increment a counter group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounterGroup(metricName, {
      label: metricLabel
    })
    metric.increment({
      [metricKey]: true
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} 1`, 'did not include updated metric')
  })

  it('should increment a counter group with a value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounterGroup(metricName, {
      label: metricLabel
    })
    metric.increment({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a counter group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerCounterGroup(metricName, {
      label: metricLabel,
      calculate: () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a counter group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()()
    metrics.registerCounterGroup(metricName, {
      label: metricLabel,
      calculate: async () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a counter group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()()
    const metric = metrics.registerCounterGroup(metricName, {
      label: metricLabel
    })
    metric.increment({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')

    metric.reset()

    await expect(client.register.metrics()).to.eventually.not.include(metricKey, 'still included metric key')
  })
})
