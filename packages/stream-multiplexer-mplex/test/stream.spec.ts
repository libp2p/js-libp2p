/* eslint-env mocha */

import { readableStreamFromArray, readableStreamFromGenerator, transformStreamEach, writeableStreamToDrain } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import * as cborg from 'cborg'
import randomBytes from 'iso-random-stream/src/random.js'
import defer from 'p-defer'
import randomInt from 'random-int'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { MessageTypes, MessageTypeNames } from '../src/message-types.js'
import { createStream } from '../src/stream.js'
import { messageWithBytes } from './fixtures/utils.js'
import type { Message } from '../src/message-types.js'
import type { MplexStream } from '../src/mplex.js'

function randomInput (min = 1, max = 100): Uint8Array[] {
  return Array.from(Array(randomInt(min, max)), () => randomBytes(randomInt(1, 128)))
}

function expectMsgType (actual: keyof typeof MessageTypeNames, expected: keyof typeof MessageTypeNames): void {
  expect(MessageTypeNames[actual]).to.equal(MessageTypeNames[expected])
}

function echoedMessage (message: Message): Message {
  if (message.type !== MessageTypes.MESSAGE_RECEIVER) {
    throw new Error('Message was not a receiver message')
  }

  return bufferToMessage(message.data.slice())
}

function expectMessages (messages: Message[], codes: Array<keyof typeof MessageTypeNames>): void {
  messages.slice(0, codes.length).forEach((msg, index) => {
    expect(msg).to.have.property('type', codes[index])

    if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
      expect(messageWithBytes(msg)).to.have.property('data').that.equalBytes([index - 1])
    }
  })
}

function expectEchoedMessages (messages: Message[], codes: Array<keyof typeof MessageTypeNames>): void {
  expectMessages(messages.slice(0, codes.length).map(echoedMessage), codes)
}

const msgToBuffer = (msg: Message): Uint8Array => {
  const m: any = {
    ...msg
  }

  if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    m.data = msg.data.slice()
  }

  return cborg.encode(m)
}

const bufferToMessage = (buf: Uint8Array | Uint8ArrayList): Message => cborg.decode(buf.subarray())

interface onMessage {
  (msg: Message, initator: MplexStream, receiver: MplexStream): void
}

export interface StreamPair {
  initiatorMessages: Message[]
  receiverMessages: Message[]
}

async function streamPair (n: number, onInitiatorMessage?: onMessage, onReceiverMessage?: onMessage): Promise<StreamPair> {
  const receiverMessages: Message[] = []
  const initiatorMessages: Message[] = []
  const id = 5

  const mockInitiatorSend = (msg: Message): void => {
    initiatorMessages.push(msg)
    receiver.sourcePush(msgToBuffer(msg))
    onInitiatorMessage?.(msg, initiator, receiver)
  }
  const mockReceiverSend = (msg: Message): void => {
    receiverMessages.push(msg)
    initiator.sourcePush(msgToBuffer(msg))

    onReceiverMessage?.(msg, initiator, receiver)
  }
  const initiator = createStream({ id, send: mockInitiatorSend, type: 'initiator' })
  const receiver = createStream({ id, send: mockReceiverSend, type: 'receiver' })
  const input = new Array(n).fill(0).map((_, i) => Uint8Array.from([i]))

  await Promise.all([
    receiver.readable
      .pipeThrough(transformStreamEach((buf) => {
        const msg = bufferToMessage(buf)

        // when the initiator sends a CLOSE message, we call close
        if (msg.type === MessageTypes.CLOSE_INITIATOR) {
          receiver.closeRead()
        }

        // when the initiator sends a RESET message, we call close
        if (msg.type === MessageTypes.RESET_INITIATOR) {
          receiver.reset()
        }
      }))
      .pipeTo(receiver.writable)
      .catch(() => {}),
    readableStreamFromArray(input)
      .pipeThrough(initiator)
      .pipeThrough(transformStreamEach(async buf => {
        const msg: Message = bufferToMessage(buf)

        // when the receiver sends a CLOSE message, we call close
        if (msg.type === MessageTypes.CLOSE_RECEIVER) {
          await initiator.close()
        }

        // when the receiver sends a RESET message, we call close
        if (msg.type === MessageTypes.RESET_RECEIVER) {
          initiator.reset()
        }
      }))
      .pipeTo(writeableStreamToDrain())
      .catch(() => {})
  ])

  return {
    receiverMessages,
    initiatorMessages
  }
}

describe('stream', () => {
  it('should initiate stream with NEW_STREAM message', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const stream = createStream({ id, send: mockSend })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    expect(msgs[0].id).to.equal(id)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)
    expect(messageWithBytes(msgs[0])).to.have.property('data').that.equalBytes(uint8ArrayFromString(id.toString()))
  })

  it('should initiate named stream with NEW_STREAM message', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const stream = createStream({ id, name, send: mockSend })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    expect(msgs[0].id).to.equal(id)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)
    expect(messageWithBytes(msgs[0])).to.have.property('data').that.equalBytes(uint8ArrayFromString(name))
  })

  it('should end a stream when it is aborted', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const deferred = defer()
    const stream = createStream({ id, name, onEnd: deferred.resolve, send: mockSend })

    const error = new Error('boom')
    stream.abort(error)

    const err = await deferred.promise
    expect(err).to.equal(error)
  })

  it('should end a stream when it is reset', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const deferred = defer()
    const stream = createStream({ id, name, onEnd: deferred.resolve, send: mockSend })

    stream.reset()

    const err = await deferred.promise
    expect(err).to.exist()
    expect(err).to.have.property('code', 'ERR_STREAM_RESET')
  })

  it('should send data with MESSAGE_INITIATOR messages if stream initiator', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator' })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    // First and last should be NEW_STREAM and CLOSE
    const dataMsgs = msgs.slice(1, -1)
    expect(dataMsgs).have.length(input.length)

    dataMsgs.forEach((msg, i) => {
      expect(msg.id).to.equal(id)
      expectMsgType(msg.type, MessageTypes.MESSAGE_INITIATOR)
      expect(messageWithBytes(msg)).to.have.property('data').that.equalBytes(input[i].subarray())
    })
  })

  it('should send data with MESSAGE_RECEIVER messages if stream receiver', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver' })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    // Last should be CLOSE
    const dataMsgs = msgs.slice(0, -1)
    expect(dataMsgs).have.length(input.length)

    dataMsgs.forEach((msg, i) => {
      expect(msg.id).to.equal(id)
      expectMsgType(msg.type, MessageTypes.MESSAGE_RECEIVER)
      expect(messageWithBytes(msg)).to.have.property('data').that.equalBytes(input[i].subarray())
    })
  })

  it('should close stream with CLOSE_INITIATOR message if stream initiator', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator' })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    const closeMsg = msgs[msgs.length - 1]

    expect(closeMsg.id).to.equal(id)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_INITIATOR)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should close stream with CLOSE_RECEIVER message if stream receiver', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver' })
    const input = randomInput()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    const closeMsg = msgs[msgs.length - 1]

    expect(closeMsg.id).to.equal(id)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_RECEIVER)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_INITIATOR message if stream initiator', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator' })
    const error = new Error(`Boom ${Date.now()}`)
    const input = function * (): Generator<Uint8Array, void, unknown> {
      for (let i = 0; i < randomInt(1, 10); i++) {
        yield randomBytes(randomInt(1, 128))
      }
      throw error
    }

    await expect(readableStreamFromGenerator(input()).pipeTo(stream.writable))
      .to.eventually.be.rejected.with.property('message', error.message)

    const resetMsg = msgs[msgs.length - 1]

    expect(resetMsg.id).to.equal(id)
    expectMsgType(resetMsg.type, MessageTypes.RESET_INITIATOR)
    expect(resetMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_RECEIVER message if stream receiver', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver' })
    const error = new Error(`Boom ${Date.now()}`)
    const input = function * (): Generator<Uint8Array, void, unknown> {
      for (let i = 0; i < randomInt(1, 10); i++) {
        yield randomBytes(randomInt(1, 128))
      }
      throw error
    }

    await expect(readableStreamFromGenerator(input()).pipeTo(stream.writable))
      .to.eventually.be.rejected.with.property('message', error.message)

    const resetMsg = msgs[msgs.length - 1]

    expect(resetMsg.id).to.equal(id)
    expectMsgType(resetMsg.type, MessageTypes.RESET_RECEIVER)
    expect(resetMsg).to.not.have.property('data')
  })

  it('should close for reading (remote close)', async () => {
    const dataLength = 5
    const {
      initiatorMessages,
      receiverMessages
    } = await streamPair(dataLength)

    // 1x NEW_STREAM, dataLength x MESSAGE_INITIATOR 1x CLOSE_INITIATOR
    expect(initiatorMessages).to.have.lengthOf(1 + dataLength + 1)
    expectMessages(initiatorMessages, [
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])

    // all the initiator messages plus CLOSE_RECEIVER
    expect(receiverMessages).to.have.lengthOf(8)
    expectEchoedMessages(receiverMessages, [
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])
    expect(receiverMessages[receiverMessages.length - 1]).to.have.property('type', MessageTypes.CLOSE_RECEIVER)
  })

  it('should close for reading and writing (local error)', async () => {
    const maxMsgs = 2
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 10
    const {
      initiatorMessages,
      receiverMessages
    } = await streamPair(dataLength, (msg, initiator) => {
      messages++

      if (messages === maxMsgs) {
        initiator.abort(error)
      }
    })

    expect(initiatorMessages).to.have.property('length')
      .that.is.lessThan(dataLength)

    // initiator sent reset message
    expect(initiatorMessages[initiatorMessages.length - 1])
      .to.have.property('type', MessageTypes.RESET_INITIATOR)

    // not all messages were received
    expect(receiverMessages).to.have.property('length')
      .that.is.lessThan(dataLength)
  })

  it('should close for reading and writing (abort on remote error)', async () => {
    const maxMsgs = 4
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 10
    const {
      initiatorMessages,
      receiverMessages
    } = await streamPair(dataLength, (receiverMessage, initiator, receiver) => {
      messages++

      if (messages === maxMsgs) {
        receiver.abort(error)
      }
    })

    // not all messages were sent
    expect(initiatorMessages).to.have.property('length')
      .that.is.lessThan(dataLength)

    // recipient sent reset message
    expect(receiverMessages[receiverMessages.length - 1])
      .to.have.property('type', MessageTypes.RESET_RECEIVER)
  })

  it('should call onEnd only when both sides have closed', async () => {
    const send = (msg: Message): void => {
      if (msg.type === MessageTypes.CLOSE_INITIATOR) {
        // simulate remote closing connection
        stream.closeRead()
      } else if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
        stream.sourcePush(msgToBuffer(msg))
      }
    }
    const id = randomInt(1000)
    const name = id.toString()
    const deferred = defer()
    const onEnd = (err?: any): void => { err != null ? deferred.reject(err) : deferred.resolve() }
    const stream = createStream({ id, name, send, onEnd })
    const input = randomInput()

    void readableStreamFromArray(input)
      .pipeThrough(stream)
      .pipeTo(writeableStreamToDrain())

    await deferred.promise
  })

  it('should call onEnd with error for local error', async () => {
    const send = (): void => {
      throw new Error(`Local boom ${Date.now()}`)
    }
    const id = randomInt(1000)
    const deferred = defer()
    const onEnd = (err?: any): void => { err != null ? deferred.reject(err) : deferred.resolve() }
    const stream = createStream({ id, send, onEnd })
    const input = randomInput()

    void readableStreamFromArray(input)
      .pipeThrough(stream)
      .pipeTo(writeableStreamToDrain())
      .catch(() => {})

    await expect(deferred.promise).to.eventually.be.rejectedWith(/Local boom/)
  })

  it('should split writes larger than max message size', async () => {
    const messages: Message[] = []

    const send = (msg: Message): void => {
      if (msg.type === MessageTypes.CLOSE_INITIATOR) {
        stream.closeRead()
      } else if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
        messages.push(msg)
      }
    }
    const maxMsgSize = 10
    const id = randomInt(1000)
    const stream = createStream({ id, send, maxMsgSize })

    await readableStreamFromArray([
      new Uint8Array(maxMsgSize * 2)
    ])
      .pipeThrough(stream)
      .pipeTo(writeableStreamToDrain())

    expect(messages.length).to.equal(2)
    expect(messages[0]).to.have.nested.property('data.length', maxMsgSize)
    expect(messages[1]).to.have.nested.property('data.length', maxMsgSize)
  })

  it('should error on double-sink', async () => {
    const send = (): void => {}
    const id = randomInt(1000)
    const stream = createStream({ id, send })

    // first sink is ok
    await readableStreamFromArray([])
      .pipeTo(stream.writable)

    // cannot sink twice
    await expect(
      readableStreamFromArray([])
        .pipeTo(stream.writable)
    )
      .to.eventually.be.rejected.with.property('message').that.matches(/closed/)
  })

  it('should chunk really big messages', async () => {
    const msgs: Message[] = []
    const mockSend = (msg: Message): void => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const maxMsgSize = 10
    const stream = createStream({ id, name, send: mockSend, maxMsgSize })
    const input = [
      new Uint8Array(1024).map(() => randomInt(0, 255))
    ]
    const output = new Uint8ArrayList()

    await readableStreamFromArray(input).pipeTo(stream.writable)

    expect(msgs).to.have.lengthOf(105)
    expect(msgs[0].id).to.equal(id)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)

    for (let i = 1; i < msgs.length - 1; i++) {
      const msg = msgs[i]
      expectMsgType(msg.type, MessageTypes.MESSAGE_INITIATOR)

      if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
        output.append(msg.data)
      }
    }

    expectMsgType(msgs[msgs.length - 1].type, MessageTypes.CLOSE_INITIATOR)
    expect(output.subarray()).to.equalBytes(input[0])
  })
})
