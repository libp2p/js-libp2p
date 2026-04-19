import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import * as lengthPrefixed from 'it-length-prefixed'
import { bytes } from 'multiformats'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { MAX_MESSAGE_SIZE, PROTOBUF_OVERHEAD } from '../src/constants.js'
import { Message } from '../src/private-to-public/pb/message.js'
import { createStream } from '../src/stream.js'
import { isFirefox } from '../src/util.ts'
import { RTCPeerConnection } from '../src/webrtc/index.js'
import { receiveFinAck, receiveRemoteCloseWrite } from './util.ts'
import type { WebRTCStream } from '../src/stream.js'
import type { Stream, StreamCloseEvent } from '@libp2p/interface'

describe('Max message size', () => {
  it(`sends messages smaller or equal to ${MAX_MESSAGE_SIZE} bytes in one`, async () => {
    const data = new Uint8Array(MAX_MESSAGE_SIZE - PROTOBUF_OVERHEAD)
    const channel = stubInterface<RTCDataChannel>({
      readyState: 'open',
      bufferedAmount: 0
    })

    // Make sure that a message with all fields will be exactly MAX_MESSAGE_SIZE
    const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({
      flag: Message.Flag.STOP_SENDING,
      message: data
    }))
    expect(messageLengthEncoded).to.have.lengthOf(MAX_MESSAGE_SIZE)

    const webrtcStream = createStream({
      channel,
      direction: 'outbound',
      closeTimeout: 1,
      log: defaultLogger().forComponent('test')
    })

    const sendMore = webrtcStream.send(data)
    expect(sendMore).to.be.true()

    if (isFirefox) {
      // TODO: firefox can deliver small messages out of order - remove once a
      // browser with https://bugzilla.mozilla.org/show_bug.cgi?id=1983831 is
      // available in playwright-test
      expect(channel.send).to.have.property('callCount', 1)
    } else {
      expect(channel.send).to.have.property('callCount', 2)
    }

    const bytes = channel.send.getCalls().reduce((acc, curr) => {
      return acc + curr.args[0].byteLength
    }, 0)

    expect(bytes).to.be.lessThan(MAX_MESSAGE_SIZE)

    if (isFirefox) {
      // minus 2x bytes because there is no flag field in the protobuf message
      expect(channel.send.getCall(0).args[0]).to.have.lengthOf(MAX_MESSAGE_SIZE - 2)
    } else {
      // minus 2x bytes because there is no flag field in the protobuf message
      expect(channel.send.getCall(1).args[0]).to.have.lengthOf(MAX_MESSAGE_SIZE - 4)
    }
  })

  it(`sends messages greater than ${MAX_MESSAGE_SIZE} bytes in parts`, async () => {
    const data = new Uint8Array(MAX_MESSAGE_SIZE + 1)
    const channel = stubInterface<RTCDataChannel>({
      readyState: 'open',
      bufferedAmount: 0
    })

    const webrtcStream = createStream({
      channel,
      direction: 'outbound',
      log: defaultLogger().forComponent('test')
    })

    webrtcStream.send(data)

    expect(channel.send).to.have.property('callCount').that.is.greaterThan(1)
    for (let i = 0; i < channel.send.callCount; i++) {
      expect(channel.send.getCall(i).args[0]).to.have.length.that.is.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })
})

describe('Datachannel send errors', () => {
  let pcA: RTCPeerConnection
  let pcB: RTCPeerConnection

  afterEach(() => {
    pcA?.close()
    pcB?.close()
  })

  it('aborts the stream when underlying datachannel is closed mid-send', async () => {
    // open a real datachannel pair so we can trigger the JS-vs-native state
    // divergence in the node-datachannel polyfill: peerConnection.close()
    // synchronously closes the native datachannel at the C++ level, but the
    // polyfill's cached readyState only updates when the onClosed callback
    // fires on the next event loop tick. Calling send() in that race window
    // passes the readyState guard and reaches the native binding, which
    // throws "DataChannel is closed"
    pcA = new RTCPeerConnection()
    pcB = new RTCPeerConnection()
    const channelA = pcA.createDataChannel('test', { negotiated: true, id: 91 })
    const channelB = pcB.createDataChannel('test', { negotiated: true, id: 91 })

    pcA.onicecandidate = ({ candidate }) => {
      if (candidate != null) {
        pcB.addIceCandidate(candidate).catch(() => {})
      }
    }
    pcB.onicecandidate = ({ candidate }) => {
      if (candidate != null) {
        pcA.addIceCandidate(candidate).catch(() => {})
      }
    }

    await pcA.setLocalDescription(await pcA.createOffer())
    await pcB.setRemoteDescription(pcA.localDescription as RTCSessionDescriptionInit)
    await pcB.setLocalDescription(await pcB.createAnswer())
    await pcA.setRemoteDescription(pcB.localDescription as RTCSessionDescriptionInit)

    await Promise.all([
      pEvent(channelA, 'open', { rejectionEvents: ['close', 'error'] }),
      pEvent(channelB, 'open', { rejectionEvents: ['close', 'error'] })
    ])

    const webrtcStream = createStream({
      channel: channelA,
      direction: 'outbound',
      closeTimeout: 1,
      log: defaultLogger().forComponent('test')
    })

    // synchronously close the native peer; polyfill readyState is still 'open'
    pcA.close()
    expect(channelA.readyState).to.equal('open')

    const closeEventPromise = pEvent<'close', StreamCloseEvent>(webrtcStream, 'close')
    webrtcStream.send(new Uint8Array([1, 2, 3, 4]))
    const closeEvent = await closeEventPromise

    expect(closeEvent.error).to.exist()
    expect(webrtcStream.status).to.equal('aborted')
  })
})

const TEST_MESSAGE = 'test_message'

async function setup (): Promise<{ peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel, stream: WebRTCStream }> {
  const peerConnection = new RTCPeerConnection()
  const dataChannel = peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })

  await pEvent(dataChannel, 'open', {
    rejectionEvents: [
      'close',
      'error'
    ]
  })

  const stream = createStream({
    channel: dataChannel,
    direction: 'outbound',
    closeTimeout: 1,
    log: defaultLogger().forComponent('test')
  })

  return { peerConnection, dataChannel, stream }
}

function generatePbByFlag (flag?: Message.Flag): Uint8Array {
  const buf = Message.encode({
    flag,
    message: bytes.fromString(TEST_MESSAGE)
  })

  return lengthPrefixed.encode.single(buf).subarray()
}

// TODO: move to transport interface compliance suite
describe.skip('Stream Stats', () => {
  let stream: WebRTCStream
  let peerConnection: RTCPeerConnection
  let dataChannel: RTCDataChannel

  beforeEach(async () => {
    ({ stream, peerConnection, dataChannel } = await setup())
  })

  afterEach(() => {
    if (peerConnection != null) {
      peerConnection.close()
    }
  })

  it('can construct', () => {
    expect(stream.timeline.close).to.not.exist()
  })

  it('close marks it closed', async () => {
    expect(stream.timeline.close).to.not.exist()
    expect(stream.writeStatus).to.equal('writable')

    receiveFinAck(dataChannel)
    receiveRemoteCloseWrite(dataChannel)

    await Promise.all([
      pEvent(stream, 'close'),
      stream.close()
    ])

    expect(stream.timeline.close).to.be.a('number')
    expect(stream.writeStatus).to.equal('closed')
  })

  it('closeRead marks it read-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.closeRead()

    expect(stream).to.have.property('writeStatus', 'writable')
    expect(stream).to.have.property('readStatus', 'closed')
  })

  it('closeWrite marks it write-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()

    receiveFinAck(dataChannel)
    await stream.close()

    expect(stream).to.have.property('writeStatus', 'closed')
    expect(stream).to.have.property('readStatus', 'readable')
  })

  it('abort = close', () => {
    expect(stream.timeline.close).to.not.exist()
    stream.abort(new Error('Oh no!'))
    expect(stream.timeline.close).to.be.a('number')
  })

  it('reset = close', () => {
    expect(stream.timeline.close).to.not.exist()
    stream.onRemoteReset() // only resets the write side
    expect(stream.timeline.close).to.be.a('number')
    expect(stream.timeline.close).to.be.greaterThanOrEqual(stream.timeline.open)
  })
})

// TODO: move to transport interface compliance suite
describe.skip('Stream Read Stats Transition By Incoming Flag', () => {
  let dataChannel: RTCDataChannel
  let stream: Stream
  let peerConnection: RTCPeerConnection

  beforeEach(async () => {
    ({ dataChannel, stream, peerConnection } = await setup())
  })

  afterEach(() => {
    if (peerConnection != null) {
      peerConnection.close()
    }
  })

  it('no flag, no transition', () => {
    expect(stream.timeline.close).to.not.exist()
    const data = generatePbByFlag()
    dataChannel.onmessage?.(new MessageEvent('message', { data }))

    expect(stream.timeline.close).to.not.exist()
  })

  it('open to read-close by flag:FIN', async () => {
    const data = generatePbByFlag(Message.Flag.FIN)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.readStatus).to.equal('closed')
  })

  it('read-close to close by flag:STOP_SENDING', async () => {
    const data = generatePbByFlag(Message.Flag.STOP_SENDING)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.remoteReadStatus).to.equal('closed')
  })
})

// TODO: move to transport interface compliance suite
describe.skip('Stream Write Stats Transition By Incoming Flag', () => {
  let dataChannel: RTCDataChannel
  let stream: Stream
  let peerConnection: RTCPeerConnection

  beforeEach(async () => {
    ({ dataChannel, stream, peerConnection } = await setup())
  })

  afterEach(() => {
    if (peerConnection != null) {
      peerConnection.close()
    }
  })

  it('open to write-close by flag:STOP_SENDING', async () => {
    const data = generatePbByFlag(Message.Flag.STOP_SENDING)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.remoteReadStatus).to.equal('closed')
  })

  it('write-close to close by flag:FIN', async () => {
    const data = generatePbByFlag(Message.Flag.FIN)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.remoteWriteStatus).to.equal('closed')
  })
})
