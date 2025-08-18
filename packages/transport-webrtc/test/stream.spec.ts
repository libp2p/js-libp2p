import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import * as lengthPrefixed from 'it-length-prefixed'
import { bytes } from 'multiformats'
import { stubInterface } from 'sinon-ts'
import { MAX_MESSAGE_SIZE, PROTOBUF_OVERHEAD } from '../src/constants.js'
import { Message } from '../src/private-to-public/pb/message.js'
import { createStream } from '../src/stream.js'
import { RTCPeerConnection } from '../src/webrtc/index.js'
import { receiveFinAck } from './util.js'
import type { WebRTCStream } from '../src/stream.js'
import type { Stream } from '@libp2p/interface'

describe('Max message size', () => {
  it(`sends messages smaller or equal to ${MAX_MESSAGE_SIZE} bytes in one`, async () => {
    const data = new Uint8Array(MAX_MESSAGE_SIZE - PROTOBUF_OVERHEAD)
    const channel = stubInterface<RTCDataChannel>({
      readyState: 'open'
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

    webrtcStream.send(data)
    await webrtcStream.closeWrite()

    expect(channel.send).to.have.property('callCount', 1)
    expect(channel.send.getCall(0).args[0]).to.have.lengthOf(MAX_MESSAGE_SIZE)
  })

  it(`sends messages greater than ${MAX_MESSAGE_SIZE} bytes in parts`, async () => {
    const data = new Uint8Array(MAX_MESSAGE_SIZE)
    const channel = stubInterface<RTCDataChannel>({
      readyState: 'open'
    })

    const webrtcStream = createStream({
      channel,
      direction: 'outbound',
      log: defaultLogger().forComponent('test')
    })

    webrtcStream.send(data)
    await webrtcStream.closeWrite()

    expect(channel.send).to.have.property('callCount').that.is.greaterThan(1)

    for (let i = 0; i < channel.send.callCount; i++) {
      expect(channel.send.getCall(i).args[0]).to.have.length.that.is.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })
})

const TEST_MESSAGE = 'test_message'

function setup (): { peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel, stream: WebRTCStream } {
  const peerConnection = new RTCPeerConnection()
  const dataChannel = peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
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

describe('Stream Stats', () => {
  let stream: WebRTCStream
  let peerConnection: RTCPeerConnection
  let dataChannel: RTCDataChannel

  beforeEach(async () => {
    ({ stream, peerConnection, dataChannel } = setup())
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

    receiveFinAck(dataChannel)
    await stream.closeWrite()

    expect(stream.timeline.close).to.be.a('number')
  })

  it('closeRead marks it read-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.closeRead()
    expect(stream.timeline.close).to.not.exist()
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('closeWrite marks it write-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()

    receiveFinAck(dataChannel)
    await stream.closeWrite()

    expect(stream.timeline.close).to.not.exist()
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('closeWrite AND closeRead = close', async () => {
    expect(stream.timeline.close).to.not.exist()

    receiveFinAck(dataChannel)
    await Promise.all([
      stream.closeRead(),
      stream.closeWrite()
    ])

    expect(stream.timeline.close).to.be.a('number')
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('abort = close', () => {
    expect(stream.timeline.close).to.not.exist()
    stream.abort(new Error('Oh no!'))
    expect(stream.timeline.close).to.be.a('number')
    expect(stream.timeline.close).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('reset = close', () => {
    expect(stream.timeline.close).to.not.exist()
    stream.onRemoteReset() // only resets the write side
    expect(stream.timeline.close).to.be.a('number')
    expect(stream.timeline.close).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })
})

describe('Stream Read Stats Transition By Incoming Flag', () => {
  let dataChannel: RTCDataChannel
  let stream: Stream
  let peerConnection: RTCPeerConnection

  beforeEach(async () => {
    ({ dataChannel, stream, peerConnection } = setup())
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

    expect(stream.timeline.closeWrite).to.not.exist()
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('read-close to close by flag:STOP_SENDING', async () => {
    const data = generatePbByFlag(Message.Flag.STOP_SENDING)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.not.exist()
  })
})

describe('Stream Write Stats Transition By Incoming Flag', () => {
  let dataChannel: RTCDataChannel
  let stream: Stream
  let peerConnection: RTCPeerConnection

  beforeEach(async () => {
    ({ dataChannel, stream, peerConnection } = setup())
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

    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.not.exist()
  })

  it('write-close to close by flag:FIN', async () => {
    const data = generatePbByFlag(Message.Flag.FIN)
    dataChannel.dispatchEvent(new MessageEvent('message', { data }))

    await delay(100)

    expect(stream.timeline.closeWrite).to.not.exist()
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })
})
