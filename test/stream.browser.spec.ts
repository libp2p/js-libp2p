import * as underTest from '../src/stream'
import { expect, assert } from 'aegir/chai'

function setup (): { peerConnection: RTCPeerConnection, datachannel: RTCDataChannel, webrtcStream: underTest.WebRTCStream } {
  const peerConnection = new RTCPeerConnection()
  const datachannel = peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
  const webrtcStream = new underTest.WebRTCStream({ channel: datachannel, stat: underTest.defaultStat('outbound') })

  return { peerConnection, datachannel, webrtcStream }
}

describe('Stream Stats', () => {
  it('can construct', () => {
    const { webrtcStream } = setup()
    assert.notExists(webrtcStream.stat.timeline.close)
  })

  it('close marks it closed', () => {
    const { webrtcStream } = setup()

    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.OPEN)
    webrtcStream.close()
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.CLOSED)
  })

  it('closeRead marks it read-closed only', () => {
    const { webrtcStream } = setup()

    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.OPEN)
    webrtcStream.closeRead()
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.READ_CLOSED)
  })

  it('closeWrite marks it write-closed only', () => {
    const { webrtcStream } = setup()

    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.OPEN)
    webrtcStream.closeWrite()
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.WRITE_CLOSED)
  })

  it('closeWrite AND closeRead = close', () => {
    const { webrtcStream } = setup()

    webrtcStream.closeWrite()
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.WRITE_CLOSED)
    webrtcStream.closeRead()
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.CLOSED)
  })

  it('abort = close', () => {
    const { webrtcStream } = setup()

    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.OPEN)
    webrtcStream.abort({ name: 'irrelevant', message: 'this parameter is actually ignored' })
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.CLOSED)
    expect(webrtcStream.stat.timeline.close).to.be.greaterThan(webrtcStream.stat.timeline.open)
  })

  it('reset = close', () => {
    const { datachannel, webrtcStream } = setup()

    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.OPEN)
    webrtcStream.reset() // only resets the write side
    expect(webrtcStream.streamState.state).to.equal(underTest.StreamStates.CLOSED)
    expect(datachannel.readyState).to.be.oneOf(['closing', 'closed'])
  })
})
