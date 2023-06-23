import { expect } from 'aegir/chai'
import delay from 'delay'
import * as lengthPrefixed from 'it-length-prefixed'
import { bytes } from 'multiformats'
import { Message } from '../src/pb/message.js'
import { createStream } from '../src/stream'
import type { RawStream } from '@libp2p/interface/connection'
const TEST_MESSAGE = 'test_message'

function setup (): { peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel, stream: RawStream } {
  const peerConnection = new RTCPeerConnection()
  const dataChannel = peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
  const stream = createStream({ channel: dataChannel, direction: 'outbound' })

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
  let stream: RawStream

  beforeEach(async () => {
    ({ stream } = setup())
  })

  it('can construct', () => {
    expect(stream.timeline.close).to.not.exist()
  })

  it('close marks it closed', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.close()
    expect(stream.timeline.close).to.be.a('number')
  })

  it('closeRead marks it read-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.readable.cancel()
    expect(stream.timeline.close).to.not.exist()
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('closeWrite marks it write-closed only', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.writable.close()
    expect(stream.timeline.close).to.not.exist()
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('closeWrite AND closeRead = close', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.writable.close()
    await stream.readable.cancel()
    expect(stream.timeline.close).to.be.a('number')
    expect(stream.timeline.closeWrite).to.be.greaterThanOrEqual(stream.timeline.open)
    expect(stream.timeline.closeRead).to.be.greaterThanOrEqual(stream.timeline.open)
  })

  it('closeWrite AND closeRead = close', async () => {
    expect(stream.timeline.close).to.not.exist()
    await stream.close()
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
})

describe('Stream Read Stats Transition By Incoming Flag', () => {
  let dataChannel: RTCDataChannel
  let stream: RawStream

  beforeEach(async () => {
    ({ dataChannel, stream } = setup())
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
  let stream: RawStream

  beforeEach(async () => {
    ({ dataChannel, stream } = setup())
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
