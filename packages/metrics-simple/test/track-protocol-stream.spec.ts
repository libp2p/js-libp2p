import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { simpleMetrics } from '../src/index.js'
import type { Stream } from '@libp2p/interface'
 
describe('SimpleMetrics - protocol stream counters', () => {
  function makeMetrics (): ReturnType<ReturnType<typeof simpleMetrics>> {
    return simpleMetrics({ onMetrics: () => {} })({
      logger: defaultLogger()
    })
  }
 
  function makeStream (direction: 'inbound' | 'outbound', protocol: string): Stream {
    const stub = stubInterface<Stream>({
      direction,
      protocol,
      log: defaultLogger().forComponent('stream')
    })
    const target = new EventTarget()
    ;(stub as any).addEventListener = target.addEventListener.bind(target)
    ;(stub as any).removeEventListener = target.removeEventListener.bind(target)
    ;(stub as any).dispatchEvent = target.dispatchEvent.bind(target)
    return stub
  }
 
  it('increments opened counter when trackProtocolStream is called', async () => {
    const metrics = makeMetrics() as any
    const stream = makeStream('outbound', '/identify/1.0.0')
 
    metrics.trackProtocolStream(stream)
 
    const opened = await metrics.metrics.get('libp2p_protocol_streams_opened_total')?.collect()
    const closed = await metrics.metrics.get('libp2p_protocol_streams_closed_total')?.collect()
 
    expect(opened).to.deep.include({ 'outbound /identify/1.0.0': 1 })
    // closed counter must NOT have fired yet
    expect(closed).to.deep.equal({})
  })
 
  it('increments closed counter on graceful stream close', async () => {
    const metrics = makeMetrics() as any
    const stream = makeStream('inbound', '/ping/1.0.0')
 
    metrics.trackProtocolStream(stream)
    stream.dispatchEvent(new Event('close'))
 
    const opened = await metrics.metrics.get('libp2p_protocol_streams_opened_total')?.collect()
    const closed = await metrics.metrics.get('libp2p_protocol_streams_closed_total')?.collect()
 
    expect(opened).to.deep.include({ 'inbound /ping/1.0.0': 1 })
    expect(closed).to.deep.include({ 'inbound /ping/1.0.0': 1 })
  })
 
  it('increments closed counter exactly once because listener is registered with once:true', async () => {
    const metrics = makeMetrics() as any
    const stream = makeStream('outbound', '/test/1.0.0')
 
    metrics.trackProtocolStream(stream)
    stream.dispatchEvent(new Event('close'))
    stream.dispatchEvent(new Event('close'))
 
    const closed = await metrics.metrics.get('libp2p_protocol_streams_closed_total')?.collect()
    expect(closed['outbound /test/1.0.0']).to.equal(1)
  })
 
  it('accumulates counts correctly across multiple streams', async () => {
    const metrics = makeMetrics() as any
 
    const s1 = makeStream('outbound', '/identify/1.0.0')
    const s2 = makeStream('outbound', '/identify/1.0.0')
    const s3 = makeStream('inbound', '/identify/1.0.0')
 
    metrics.trackProtocolStream(s1)
    metrics.trackProtocolStream(s2)
    metrics.trackProtocolStream(s3)
 
    // close only s1 and s3
    s1.dispatchEvent(new Event('close'))
    s3.dispatchEvent(new Event('close'))
 
    const opened = await metrics.metrics.get('libp2p_protocol_streams_opened_total')?.collect()
    const closed = await metrics.metrics.get('libp2p_protocol_streams_closed_total')?.collect()
 
    // 2 outbound + 1 inbound opened
    expect(opened['outbound /identify/1.0.0']).to.equal(2)
    expect(opened['inbound /identify/1.0.0']).to.equal(1)
 
    // 1 outbound + 1 inbound closed (s2 still open)
    expect(closed['outbound /identify/1.0.0']).to.equal(1)
    expect(closed['inbound /identify/1.0.0']).to.equal(1)
  })
 
  it('does not track a stream with no protocol', async () => {
    const metrics = makeMetrics() as any
    const stream = stubInterface<Stream>({
      protocol: undefined,
      log: defaultLogger().forComponent('stream')
    })

    metrics.trackProtocolStream(stream)

    const opened = await metrics.metrics.get('libp2p_protocol_streams_opened_total')?.collect()
    expect(opened).to.deep.equal({})
  })
})
