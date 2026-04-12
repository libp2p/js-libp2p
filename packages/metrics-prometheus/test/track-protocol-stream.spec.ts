import { defaultLogger } from '@libp2p/logger'
import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import client from 'prom-client'
import { prometheusMetrics } from '../src/index.js'

describe('prometheus protocol stream counters', () => {
  it('records opened and clean closed counters', async () => {
    const [outbound, inbound] = await streamPair()

    const metrics = prometheusMetrics({
      collectDefaultMetrics: false
    })({
      logger: defaultLogger()
    })

    metrics.trackProtocolStream(outbound)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const scraped = await client.register.metrics()
    const label = `protocol="${outbound.direction} ${outbound.protocol}"`

    expect(scraped).to.include(`libp2p_protocol_streams_opened_total{${label}} 1`)
    expect(scraped).to.include(`libp2p_protocol_streams_closed_total{${label}} 1`)
  })

  it('records opened and close-errors but not clean closed when stream aborts', async () => {
    const [outbound] = await streamPair()

    const metrics = prometheusMetrics({
      collectDefaultMetrics: false
    })({
      logger: defaultLogger()
    })

    metrics.trackProtocolStream(outbound)
    outbound.abort(new Error('test abort'))

    const scraped = await client.register.metrics()
    const label = `protocol="${outbound.direction} ${outbound.protocol}"`

    expect(scraped).to.include(`libp2p_protocol_streams_opened_total{${label}} 1`)
    expect(scraped).to.include(`libp2p_protocol_streams_close_errors_total{${label}} 1`)
    expect(scraped).not.to.include(`libp2p_protocol_streams_closed_total{${label}}`)
  })
})
