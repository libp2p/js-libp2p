import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import client from 'prom-client'
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

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

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

    // attach reader before data arrives so the stream dispatches message events
    const iterator = outbound[Symbol.asyncIterator]()

    // send data to the remote over the tracked stream
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    inbound.send(data)

    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('timed out waiting for first frame')), 200))
    ])

    expect(first.done).to.equal(false)
    expect(first.value?.byteLength).to.equal(data.length)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

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

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${outbound.protocol} sent"} ${data.length}`)
  })

  it('should not consume early protocol data before app listeners are attached', async () => {
    const [outbound, inbound] = await streamPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // Track stream before any app-level reader/listener is attached
    metrics.trackProtocolStream(outbound)

    // Remote sends data first
    const data = Uint8Array.from([9, 8, 7, 6, 5])
    inbound.send(data)

    // Allow data to arrive and be buffered
    await new Promise((resolve) => setTimeout(resolve, 25))

    // App starts reading later - should still receive first frame
    const iterator = outbound[Symbol.asyncIterator]()
    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('timed out waiting for first frame')), 200))
    ])

    expect(first.done).to.equal(false)
    expect(first.value?.byteLength).to.equal(data.length)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${inbound.protocol} received"} ${data.length}`)
  })

  it('should track bytes received over outbound streams', async () => {
    const [outbound, inbound] = await streamPair()

    const metrics = prometheusMetrics()({
      logger: defaultLogger()
    })

    // track incoming stream
    metrics.trackProtocolStream(outbound)

    // attach reader before data arrives so the stream dispatches message events
    const iterator = outbound[Symbol.asyncIterator]()

    // send data from remote to local
    const data = Uint8Array.from([0, 1, 2, 3, 4])
    inbound.send(data)

    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('timed out waiting for first frame')), 200))
    ])

    expect(first.done).to.equal(false)
    expect(first.value?.byteLength).to.equal(data.length)

    await Promise.all([
      pEvent(inbound, 'close'),
      outbound.close(),
      inbound.close()
    ])

    const scrapedMetrics = await client.register.metrics()
    expect(scrapedMetrics).to.include(`libp2p_data_transfer_bytes_total{protocol="${inbound.protocol} received"} ${data.length}`)
  })
})
