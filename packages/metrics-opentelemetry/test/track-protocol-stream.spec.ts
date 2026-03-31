import { StreamAbortEvent, TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { metrics as otelApi } from '@opentelemetry/api'
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { expect } from 'aegir/chai'
import { openTelemetryMetrics } from '../src/index.js'
import type { MessageStreamEvents, Stream } from '@libp2p/interface'
import type { ResourceMetrics, ScopeMetrics } from '@opentelemetry/sdk-metrics'

function sumScopeMetrics (sm: ScopeMetrics, metricName: string, protocolValue: string): number {
  let sub = 0
  for (const metric of sm.metrics) {
    if (metric.descriptor.name !== metricName || metric.dataPointType !== DataPointType.SUM) {
      continue
    }
    for (const dp of metric.dataPoints) {
      if (dp.attributes.protocol === protocolValue) {
        sub += dp.value as number
      }
    }
  }
  return sub
}

function sumForProtocol (batches: ResourceMetrics[], metricName: string, protocolValue: string): number {
  let total = 0
  for (const batch of batches) {
    for (const sm of batch.scopeMetrics) {
      total += sumScopeMetrics(sm, metricName, protocolValue)
    }
  }
  return total
}

describe('opentelemetry protocol stream counters', () => {
  let previousProvider: ReturnType<typeof otelApi.getMeterProvider>
  let reader: PeriodicExportingMetricReader
  let exporter: InMemoryMetricExporter
  let provider: MeterProvider
  let meterId: number

  before(() => {
    previousProvider = otelApi.getMeterProvider()
    exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE)
    reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 3_600_000
    })
    provider = new MeterProvider({ readers: [reader] })
    otelApi.setGlobalMeterProvider(provider)
  })

  after(async () => {
    await provider.shutdown()
    otelApi.setGlobalMeterProvider(previousProvider)
  })

  beforeEach(() => {
    meterId = Date.now() + Math.floor(Math.random() * 1e6)
    exporter.reset()
  })

  function makeStream (direction: 'inbound' | 'outbound', protocol: string): Stream {
    const target = new TypedEventEmitter<MessageStreamEvents>()
    return {
      direction,
      protocol,
      log: defaultLogger().forComponent('stream'),
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      send: () => true
    } as unknown as Stream
  }

  it('increments opened and clean closed counters', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: `otel-ps-test-${meterId}`,
        version: '1.0.0',
        userAgent: 'test/1.0.0'
      },
      logger: defaultLogger()
    })

    const stream = makeStream('outbound', '/identify/1.0.0')
    const label = `${stream.direction} ${stream.protocol}`

    metrics.trackProtocolStream(stream)
    stream.dispatchEvent(new Event('close'))

    await reader.forceFlush()
    const batches = exporter.getMetrics()

    expect(sumForProtocol(batches, 'libp2p_protocol_streams_opened_total', label)).to.equal(1)
    expect(sumForProtocol(batches, 'libp2p_protocol_streams_closed_total', label)).to.equal(1)
    expect(sumForProtocol(batches, 'libp2p_protocol_streams_close_errors_total', label)).to.equal(0)
  })

  it('increments close-errors counter on StreamAbortEvent', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: `otel-ps-test-${meterId}`,
        version: '1.0.0',
        userAgent: 'test/1.0.0'
      },
      logger: defaultLogger()
    })

    const stream = makeStream('inbound', '/ping/1.0.0')
    const label = `${stream.direction} ${stream.protocol}`

    metrics.trackProtocolStream(stream)
    stream.dispatchEvent(new StreamAbortEvent(new Error('aborted')))

    await reader.forceFlush()
    const batches = exporter.getMetrics()

    expect(sumForProtocol(batches, 'libp2p_protocol_streams_opened_total', label)).to.equal(1)
    expect(sumForProtocol(batches, 'libp2p_protocol_streams_closed_total', label)).to.equal(0)
    expect(sumForProtocol(batches, 'libp2p_protocol_streams_close_errors_total', label)).to.equal(1)
  })
})
