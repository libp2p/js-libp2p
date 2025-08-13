import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import client from 'prom-client'
import { raceEvent } from 'race-event'
import { prometheusMetrics } from '../src/index.js'

describe('streams', () => {
  it('should track bytes sent over outbound connections', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // track outgoing stream
    metrics.trackMultiaddrConnection(outbound)

    // send data to the remote over the tracked stream
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    outbound.send(data)
    await outbound.closeWrite()
    await raceEvent(inbound, 'close')

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="global sent"} ${data.length}`)
  })

  it('should track bytes received over outbound connections', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // track incoming stream
    metrics.trackMultiaddrConnection(outbound)

    // send data to the remote over the tracked stream
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    inbound.send(data)
    await inbound.closeWrite()
    await raceEvent(outbound, 'close')

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="global received"} ${data.length}`)
  })

  it('should track bytes sent over outbound streams', async () => {
    const [outbound, inbound] = await streamPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // track outgoing stream
    metrics.trackProtocolStream(outbound)

    // send data to the remote over the tracked stream
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    outbound.send(data)
    await outbound.closeWrite()
    await raceEvent(inbound, 'close')

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${outbound.protocol} sent"} ${data.length}`)
  })

  it('should track bytes received over outbound streams', async () => {
    const [outbound, inbound] = await streamPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // track incoming stream
    metrics.trackProtocolStream(outbound)

    // send data from remote to local
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    inbound.send(data)
    await inbound.closeWrite()
    await raceEvent(outbound, 'close')

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${inbound.protocol} received"} ${data.length}`)
  })
})
