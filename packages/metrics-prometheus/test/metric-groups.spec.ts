import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import client from 'prom-client'
import { prometheusMetrics } from '../src/index.js'
import { randomMetricName } from './fixtures/random-metric-name.js'

describe('metric groups', () => {
  it('should set a metric group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.update({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should increment a metric group without a value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.increment({
      [metricKey]: true
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} 1`, 'did not include updated metric')
  })

  it('should increment a metric group with a value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.increment({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should decrement a metric group without a value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.decrement({
      [metricKey]: true
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} -1`, 'did not include updated metric')
  })

  it('should decrement a metric group with a value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.decrement({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} -${metricValue}`, 'did not include updated metric')
  })

  it('should calculate a metric group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerMetricGroup(metricName, {
      label: metricLabel,
      calculate: () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should promise to calculate a metric group value', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    metrics.registerMetricGroup(metricName, {
      label: metricLabel,
      calculate: async () => {
        return {
          [metricKey]: metricValue
        }
      }
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')
  })

  it('should reset a metric group', async () => {
    const metricName = randomMetricName()
    const metricKey = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue = 5
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric.update({
      [metricKey]: metricValue
    })

    await expect(client.register.metrics()).to.eventually.include(`${metricName}{${metricLabel}="${metricKey}"} ${metricValue}`, 'did not include updated metric')

    metric.reset()

    await expect(client.register.metrics()).to.eventually.not.include(metricKey, 'still included metric key')
  })

  it('should allow use of the same metric group from multiple reporters', async () => {
    const metricName = randomMetricName()
    const metricKey1 = randomMetricName('key_')
    const metricKey2 = randomMetricName('key_')
    const metricLabel = randomMetricName('label_')
    const metricValue1 = 5
    const metricValue2 = 7
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric1 = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric1.update({
      [metricKey1]: metricValue1
    })
    const metric2 = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })
    metric2.update({
      [metricKey2]: metricValue2
    })

    const reportedMetrics = await client.register.metrics()

    expect(reportedMetrics).to.include(`${metricName}{${metricLabel}="${metricKey1}"} ${metricValue1}`, 'did not include updated metric')
    expect(reportedMetrics).to.include(`${metricName}{${metricLabel}="${metricKey2}"} ${metricValue2}`, 'did not include updated metric')
  })

  it('should allow grouped timers', async () => {
    const metricName = randomMetricName()
    const metricLabel = randomMetricName('label_')
    const metricKey = randomMetricName('key_')
    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })
    const metric1 = metrics.registerMetricGroup(metricName, {
      label: metricLabel
    })

    const timer = metric1.timer(metricKey)

    timer()

    const reportedMetrics = await client.register.metrics()

    expect(reportedMetrics).to.include(`${metricName}{${metricLabel}="${metricKey}"}`, 'did not include updated metric')
  })
})
