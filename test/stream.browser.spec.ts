import * as underTest from '../src/stream'
import { expect, assert } from 'chai'

describe('Stream Stats', () => {
  it('can construct', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    // expect(s.stat.timeline.close).to.not.exist();
    assert.notExists(s.stat.timeline.close)
  })

  it('close marks it closed', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })

    expect(s.streamState.state).to.equal(underTest.StreamStates.OPEN)
    s.close()
    expect(s.streamState.state).to.equal(underTest.StreamStates.CLOSED)
  })

  it('closeRead marks it read-closed only', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    expect(s.streamState.state).to.equal(underTest.StreamStates.OPEN)
    s.closeRead()
    expect(s.streamState.state).to.equal(underTest.StreamStates.READ_CLOSED)
  })

  it('closeWrite marks it write-closed only', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    expect(s.streamState.state).to.equal(underTest.StreamStates.OPEN)
    s.closeWrite()
    expect(s.streamState.state).to.equal(underTest.StreamStates.WRITE_CLOSED)
  })

  it('closeWrite AND closeRead = close', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    s.closeWrite()
    expect(s.streamState.state).to.equal(underTest.StreamStates.WRITE_CLOSED)
    s.closeRead()
    expect(s.streamState.state).to.equal(underTest.StreamStates.CLOSED)
  })

  it('abort = close', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    // expect(s.stat.timeline.close).to.not.exist();
    expect(s.streamState.state).to.equal(underTest.StreamStates.OPEN)
    s.abort({ name: 'irrelevant', message: 'this parameter is actually ignored' })
    expect(s.streamState.state).to.equal(underTest.StreamStates.CLOSED)
    // expect(s.stat.timeline.close).to.exist();
    expect(s.stat.timeline.close).to.be.greaterThan(s.stat.timeline.open)
  })

  it('reset = close', () => {
    const pc = new RTCPeerConnection()
    const dc = pc.createDataChannel('whatever', { negotiated: true, id: 91 })
    const s = new underTest.WebRTCStream({ channel: dc, stat: underTest.defaultStat('outbound') })
    // expect(s.stat.timeline.close).to.not.exist();
    expect(s.streamState.state).to.equal(underTest.StreamStates.OPEN)
    s.reset() // only resets the write side
    expect(s.streamState.state).to.equal(underTest.StreamStates.CLOSED)
    // expect(s.stat.timeline.close).to.not.exist();
    expect(dc.readyState).to.be.oneOf(['closing', 'closed'])
  })
})
