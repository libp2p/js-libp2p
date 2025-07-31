/* eslint-env mocha */

import { StreamCloseEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/test-utils'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import { pushable } from 'it-pushable'
import { raceEvent } from 'race-event'
import randomInt from 'random-int'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { mplex } from '../src/index.ts'
import { MessageTypes, MessageTypeNames } from '../src/message-types.js'
import { decode } from './fixtures/decode.ts'
import { messageWithBytes } from './fixtures/utils.js'
import type { Message } from '../src/message-types.js'
import type { MplexStream } from '../src/stream.js'
import type { MessageStream } from '@libp2p/interface'

function randomInput (min = 1, max = 100): Uint8ArrayList[] {
  return Array.from(Array(randomInt(min, max)), () => new Uint8ArrayList(randomBytes(randomInt(1, 128))))
}

function expectMsgType (actual: keyof typeof MessageTypeNames, expected: keyof typeof MessageTypeNames): void {
  expect(MessageTypeNames[actual]).to.equal(MessageTypeNames[expected])
}

export interface StreamPair {
  initiatorStream: MplexStream
  receiverStream: MplexStream,
  initiatorMessages(): Promise<Message[]>
  receiverMessages(): Promise<Message[]>
}

async function streamPair (): Promise<StreamPair> {
  const [outbound, inbound] = multiaddrConnectionPair()
  const factory = mplex()()

  const outboundMuxer = factory.createStreamMuxer({
    maConn: outbound
  })
  const inboundMuxer = factory.createStreamMuxer({
    maConn: inbound
  })

  const initiatorMessages = observeIncomingMessages(inbound)
  const receiverMessages = observeIncomingMessages(outbound)
  const receiverStream = Promise.withResolvers<MplexStream>()

  inboundMuxer.addEventListener('stream', (evt) => {
    receiverStream.resolve(evt.detail as MplexStream)
  })

  const initiatorStream = await outboundMuxer.createStream() as MplexStream

  return {
    initiatorStream,
    receiverStream: await receiverStream.promise,
    initiatorMessages,
    receiverMessages
  }
}

function observeIncomingMessages (messageStream: MessageStream): () => Promise<Message[]> {
  const output: Message[] = []
  const queue = pushable()
  const messages = Promise.withResolvers<Message[]>()

  messageStream.addEventListener('message', (evt) => {
    queue.push(evt.data.subarray())
  })

  Promise.resolve().then(async () => {
    for await (const message of decode()(queue)) {
      output.push(message)
    }

    messages.resolve(output)
  })

  return () => {
    queue.end()

    return messages.promise
  }
}

describe('stream', () => {
  it('should initiate stream with NEW_STREAM message', async () => {
    const pair = await streamPair()

    pair.initiatorStream.send(Uint8Array.from([0, 1, 2, 3, 4]))
    await pair.initiatorStream.close()
    await raceEvent(pair.receiverStream, 'close')

    const msgs = await pair.initiatorMessages()
    expect(msgs[0].id).to.equal(pair.initiatorStream.streamId)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)
    expect(messageWithBytes(msgs[0])).to.have.property('data').that.equalBytes(uint8ArrayFromString(pair.initiatorStream.id.toString()))
  })

  it('should end a stream when it is aborted', async () => {
    const error = new Error('boom')

    const pair = await streamPair()
    pair.initiatorStream.abort(error)
    const evt = await raceEvent<StreamCloseEvent>(pair.initiatorStream, 'close')

    expect(evt.error).to.equal(error)
  })

  it('should end a stream when it is reset', async () => {
    const pair = await streamPair()
    const evtPromise = raceEvent<StreamCloseEvent>(pair.initiatorStream, 'close')
    pair.initiatorStream.onRemoteReset()

    await expect(evtPromise).to.eventually.have.nested.property('error.name', 'StreamResetError')
  })

  it('should send data with MESSAGE_INITIATOR messages if stream initiator', async () => {
    const pair = await streamPair()
    const input = randomInput()

    for (const buf of input) {
      const sendMore = pair.initiatorStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.initiatorStream, 'drain')
      }
    }

    await pair.initiatorStream.close()
    await raceEvent(pair.receiverStream, 'close')

    // First and last should be NEW_STREAM and CLOSE
    const msgs = await pair.initiatorMessages()
    const dataMsgs = msgs.slice(1, -1)
    expect(dataMsgs).have.length(input.length)

    dataMsgs.forEach((msg, i) => {
      expect(msg.id).to.equal(pair.initiatorStream.streamId)
      expectMsgType(msg.type, MessageTypes.MESSAGE_INITIATOR)
      expect(messageWithBytes(msg)).to.have.property('data').that.equalBytes(input[i].subarray())
    })
  })

  it('should send data with MESSAGE_RECEIVER messages if stream receiver', async () => {
    const pair = await streamPair()
    const input = randomInput()

    for (const buf of input) {
      const sendMore = pair.receiverStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    await pair.receiverStream.close()
    await raceEvent(pair.initiatorStream, 'close')

    // Last should be CLOSE
    const msgs = await pair.receiverMessages()
    const dataMsgs = msgs.slice(0, -1)
    expect(dataMsgs).have.length(input.length)

    dataMsgs.forEach((msg, i) => {
      expect(msg.id).to.equal(pair.receiverStream.streamId)
      expectMsgType(msg.type, MessageTypes.MESSAGE_RECEIVER)
      expect(messageWithBytes(msg)).to.have.property('data').that.equalBytes(input[i].subarray())
    })
  })

  it('should close stream with CLOSE_INITIATOR message if stream initiator', async () => {
    const pair = await streamPair()
    const input = randomInput()

    for (const buf of input) {
      const sendMore = pair.initiatorStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.initiatorStream, 'drain')
      }
    }

    await pair.initiatorStream.close()
    await raceEvent(pair.receiverStream, 'close')

    const msgs = await pair.initiatorMessages()
    const closeMsg = msgs[msgs.length - 1]
    expect(closeMsg.id).to.equal(pair.initiatorStream.streamId)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_INITIATOR)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should close stream with CLOSE_RECEIVER message if stream receiver', async () => {
    const pair = await streamPair()
    const input = randomInput()

    for (const buf of input) {
      const sendMore = pair.receiverStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    await pair.receiverStream.close()
    await raceEvent(pair.initiatorStream, 'close')

    const msgs = await pair.receiverMessages()
    const closeMsg = msgs[msgs.length - 1]
    expect(closeMsg.id).to.equal(pair.receiverStream.streamId)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_RECEIVER)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_INITIATOR message if stream initiator', async () => {
    const pair = await streamPair()

    for (const buf of randomInput()) {
      const sendMore = pair.receiverStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    const error = new Error(`Boom ${Date.now()}`)
    pair.initiatorStream.abort(error)
    await raceEvent(pair.receiverStream, 'close')

    const msgs = await pair.initiatorMessages()
    const resetMsg = msgs[msgs.length - 1]
    expect(resetMsg.id).to.equal(pair.initiatorStream.streamId)
    expectMsgType(resetMsg.type, MessageTypes.RESET_INITIATOR)
    expect(resetMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_RECEIVER message if stream receiver', async () => {
    const pair = await streamPair()

    for (const buf of randomInput()) {
      const sendMore = pair.receiverStream.send(buf)

      if (!sendMore) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    const error = new Error(`Boom ${Date.now()}`)
    pair.receiverStream.abort(error)
    await raceEvent(pair.initiatorStream, 'close')

    const msgs = await pair.receiverMessages()
    const resetMsg = msgs[msgs.length - 1]
    expect(resetMsg.id).to.equal(pair.receiverStream.streamId)
    expectMsgType(resetMsg.type, MessageTypes.RESET_RECEIVER)
    expect(resetMsg).to.not.have.property('data')
  })

  it.skip('should echo messages', async () => {
    const dataLength = 1
    const pair = await streamPair()

    pair.receiverStream.addEventListener('message', (evt) => {
      pair.receiverStream.send(evt.data)
    })

    for (const buf of randomInput(dataLength, dataLength)) {
      const sendMoreInitiator = pair.initiatorStream.send(buf)

      if (!sendMoreInitiator) {
        await raceEvent(pair.initiatorStream, 'drain')
      }
    }

    await pair.initiatorStream.closeWrite()
    await pair.receiverStream.closeWrite()
    await raceEvent(pair.initiatorStream, 'close')

    const initiatorSentMessages = await pair.initiatorMessages()
    const receiverSentMessages = await pair.receiverMessages()

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      ...new Array(dataLength).fill(0).map(() => MessageTypes.MESSAGE_INITIATOR),
      MessageTypes.CLOSE_INITIATOR
    ])

    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      ...new Array(dataLength).fill(0).map(() => MessageTypes.MESSAGE_RECEIVER)
    ])
  })

  it('should close for reading (remote close)', async () => {
    const dataLength = 5
    const pair = await streamPair()

    for (const buf of randomInput(dataLength, dataLength)) {
      const sendMoreInitiator = pair.initiatorStream.send(buf)

      if (!sendMoreInitiator) {
        await raceEvent(pair.initiatorStream, 'drain')
      }

      const sendMoreReceiver = pair.receiverStream.send(buf)

      if (!sendMoreReceiver) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    await pair.receiverStream.close()
    await raceEvent(pair.initiatorStream, 'close')

    const initiatorSentMessages = await pair.initiatorMessages()
    const receiverSentMessages = await pair.receiverMessages()

    // 1x NEW_STREAM, dataLength x MESSAGE_INITIATOR 1x CLOSE_INITIATOR
    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR
    ])

    // echoes the initiator messages back plus CLOSE_RECEIVER
    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.CLOSE_RECEIVER
    ])
  })

  it('should close for reading and writing (abort on local error)', async () => {
    const dataLength = 2
    const pair = await streamPair()

    for (const buf of randomInput(dataLength, dataLength)) {
      const sendMoreInitiator = pair.initiatorStream.send(buf)

      if (!sendMoreInitiator) {
        await raceEvent(pair.initiatorStream, 'drain')
      }

      const sendMoreReceiver = pair.receiverStream.send(buf)

      if (!sendMoreReceiver) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    pair.initiatorStream.abort(new Error('wat'))
    await raceEvent(pair.receiverStream, 'close')

    const initiatorSentMessages = await pair.initiatorMessages()
    const receiverSentMessages = await pair.receiverMessages()

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.RESET_INITIATOR
    ])

    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER
    ])
  })

  it('should close for reading and writing (abort on remote error)', async () => {
    const dataLength = 2
    const pair = await streamPair()

    for (const buf of randomInput(dataLength, dataLength)) {
      const sendMoreInitiator = pair.initiatorStream.send(buf)

      if (!sendMoreInitiator) {
        await raceEvent(pair.initiatorStream, 'drain')
      }

      const sendMoreReceiver = pair.receiverStream.send(buf)

      if (!sendMoreReceiver) {
        await raceEvent(pair.receiverStream, 'drain')
      }
    }

    pair.receiverStream.abort(new Error('wat'))
    await raceEvent(pair.initiatorStream, 'close')

    const initiatorSentMessages = await pair.initiatorMessages()
    const receiverSentMessages = await pair.receiverMessages()

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR
    ])

    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.RESET_RECEIVER
    ])
  })

  it.skip('should split writes larger than max message size', async () => {
    const pair = await streamPair()

    const buf = new Uint8Array(1024 * 1024 * 10)
    pair.initiatorStream.send(buf)

    await pair.initiatorStream.close()
    await raceEvent(pair.receiverStream, 'close')

    const initiatorSentMessages = await pair.initiatorMessages()
    const receiverSentMessages = await pair.receiverMessages()

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])

    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([])
  })
})
