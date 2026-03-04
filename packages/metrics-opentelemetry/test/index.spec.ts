import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { openTelemetryMetrics } from '../src/index.js'

describe('opentelemetry-metrics', () => {
  it('should wrap a method', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    const target = {
      wrapped: function () {

      }
    }

    const wrapped = metrics.traceFunction('target.wrapped', target.wrapped, {
      optionsIndex: 0
    })

    expect(wrapped).to.not.equal(target.wrapped)
  })

  it('should track bytes over protocol streams without consuming early frames', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    const [outbound, inbound] = await streamPair({
      protocol: '/echo/1.0.0'
    })

    metrics.trackProtocolStream(outbound)

    const data = Uint8Array.from([7, 6, 5, 4, 3])
    inbound.send(data)

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

    const transferStats = (metrics as any).transferStats as Map<string, number>
    expect(transferStats.get('/echo/1.0.0 received')).to.equal(data.length)
  })

  it('should track bytes over multiaddr connections', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    const [outbound, inbound] = multiaddrConnectionPair()

    metrics.trackMultiaddrConnection(outbound)

    const data = Uint8Array.from([0, 1, 2, 3, 4])
    inbound.send(data)

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

    const transferStats = (metrics as any).transferStats as Map<string, number>
    expect(transferStats.get('global received')).to.equal(data.length)
  })

  it('should retain metrics after stop', async () => {
    const metrics = openTelemetryMetrics()({
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test/1.0.0 node/1.0.0'
      },
      logger: defaultLogger()
    })

    await start(metrics)

    const m1 = metrics.registerCounterGroup('test_metric')
    const m2 = metrics.registerCounterGroup('test_metric')

    expect(m1).to.equal(m2, 'did not re-use metric')

    await stop(metrics)

    await start(metrics)

    const m3 = metrics.registerCounterGroup('test_metric')

    expect(m3).to.equal(m1, 'did not re-use metric')
  })
})
