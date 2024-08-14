/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import * as cborg from 'cborg'
import randomBytes from 'iso-random-stream/src/random.js'
import drain from 'it-drain'
import each from 'it-foreach'
import map from 'it-map'
import { pipe } from 'it-pipe'
import defer from 'p-defer'
import randomInt from 'random-int'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { MessageTypes, MessageTypeNames } from '../src/message-types.js'
import { createStream } from '../src/stream.js'
import { arrayToGenerator, messageWithBytes } from './fixtures/utils.js'
import type { Message } from '../src/message-types.js'
import type { MplexStream } from '../src/stream.js'

function randomInput (min = 1, max = 100): Uint8ArrayList[] {
  return Array.from(Array(randomInt(min, max)), () => new Uint8ArrayList(randomBytes(randomInt(1, 128))))
}

function expectMsgType (actual: keyof typeof MessageTypeNames, expected: keyof typeof MessageTypeNames): void {
  expect(MessageTypeNames[actual]).to.equal(MessageTypeNames[expected])
}

const msgToBuffer = (msg: Message): Uint8ArrayList => {
  const m: any = {
    ...msg
  }

  if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    m.data = msg.data.slice()
  }

  return new Uint8ArrayList(cborg.encode(m))
}

const bufferToMessage = (buf: Uint8Array | Uint8ArrayList): Message => cborg.decode(buf.subarray())

interface onMessage {
  (msg: Message, initator: MplexStream, receiver: MplexStream): void
}

export interface StreamPair {
  initiatorSentMessages: Message[]
  receiverSentMessages: Message[]
}

async function streamPair (n: number, onInitiatorMessage?: onMessage, onReceiverMessage?: onMessage): Promise<StreamPair> {
  const receiverSentMessages: Message[] = []
  const initiatorSentMessages: Message[] = []
  const id = 5

  const mockInitiatorSend = async (msg: Message): Promise<void> => {
    initiatorSentMessages.push(msg)

    if (onInitiatorMessage != null) {
      onInitiatorMessage(msg, initiator, receiver)
    }

    receiver.sourcePush(msgToBuffer(msg))
  }
  const mockReceiverSend = async (msg: Message): Promise<void> => {
    receiverSentMessages.push(msg)

    if (onReceiverMessage != null) {
      onReceiverMessage(msg, initiator, receiver)
    }

    initiator.sourcePush(msgToBuffer(msg))
  }
  const initiator = createStream({ id, send: mockInitiatorSend, type: 'initiator', logger: defaultLogger() })
  const receiver = createStream({ id, send: mockReceiverSend, type: 'receiver', logger: defaultLogger() })
  const input = new Array(n).fill(0).map((_, i) => new Uint8ArrayList(Uint8Array.from([i])))

  void pipe(
    receiver,
    source => each(source, buf => {
      const msg = bufferToMessage(buf)

      // when the initiator sends a CLOSE message, we call close
      if (msg.type === MessageTypes.CLOSE_INITIATOR) {
        receiver.remoteCloseWrite()
      }

      // when the initiator sends a RESET message, we call close
      if (msg.type === MessageTypes.RESET_INITIATOR) {
        receiver.reset()
      }
    }),
    receiver
  ).catch(() => {})

  try {
    await pipe(
      arrayToGenerator(input),
      initiator,
      (source) => map(source, buf => {
        const msg: Message = bufferToMessage(buf)

        // when the receiver sends a CLOSE message, we call close
        if (msg.type === MessageTypes.CLOSE_RECEIVER) {
          initiator.remoteCloseWrite()
        }

        // when the receiver sends a RESET message, we call close
        if (msg.type === MessageTypes.RESET_RECEIVER) {
          initiator.reset()
        }
      }),
      drain
    )
  } catch {

  }

  return {
    receiverSentMessages,
    initiatorSentMessages
  }
}

describe('stream', () => {
  it('should initiate stream with NEW_STREAM message', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const stream = createStream({ id, send: mockSend, logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

    expect(msgs[0].id).to.equal(id)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)
    expect(messageWithBytes(msgs[0])).to.have.property('data').that.equalBytes(uint8ArrayFromString(id.toString()))
  })

  it('should initiate named stream with NEW_STREAM message', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const stream = createStream({ id, name, send: mockSend, logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

    expect(msgs[0].id).to.equal(id)
    expectMsgType(msgs[0].type, MessageTypes.NEW_STREAM)
    expect(messageWithBytes(msgs[0])).to.have.property('data').that.equalBytes(uint8ArrayFromString(name))
  })

  it('should end a stream when it is aborted', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const deferred = defer()
    const stream = createStream({ id, name, onEnd: deferred.resolve, send: mockSend, logger: defaultLogger() })

    const error = new Error('boom')
    stream.abort(error)

    const err = await deferred.promise
    expect(err).to.equal(error)
  })

  it('should end a stream when it is reset', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const deferred = defer()
    const stream = createStream({ id, name, onEnd: deferred.resolve, send: mockSend, logger: defaultLogger() })

    stream.reset()

    const err = await deferred.promise
    expect(err).to.exist()
    expect(err).to.have.property('name', 'StreamResetError')
  })

  it('should send data with MESSAGE_INITIATOR messages if stream initiator', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator', logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

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
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver', logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

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
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator', logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

    const closeMsg = msgs[msgs.length - 1]

    expect(closeMsg.id).to.equal(id)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_INITIATOR)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should close stream with CLOSE_RECEIVER message if stream receiver', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver', logger: defaultLogger() })
    const input = randomInput()

    await pipe(input, stream)

    const closeMsg = msgs[msgs.length - 1]

    expect(closeMsg.id).to.equal(id)
    expectMsgType(closeMsg.type, MessageTypes.CLOSE_RECEIVER)
    expect(closeMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_INITIATOR message if stream initiator', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'initiator', logger: defaultLogger() })
    const error = new Error(`Boom ${Date.now()}`)
    const input = {
      [Symbol.iterator]: function * () {
        for (let i = 0; i < randomInt(1, 10); i++) {
          yield new Uint8ArrayList(randomBytes(randomInt(1, 128)))
        }
        throw error
      }
    }

    await expect(pipe(input, stream)).to.eventually.be
      .rejected.with.property('message', error.message)

    const resetMsg = msgs[msgs.length - 1]

    expect(resetMsg.id).to.equal(id)
    expectMsgType(resetMsg.type, MessageTypes.RESET_INITIATOR)
    expect(resetMsg).to.not.have.property('data')
  })

  it('should reset stream on error with RESET_RECEIVER message if stream receiver', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = id.toString()
    const stream = createStream({ id, name, send: mockSend, type: 'receiver', logger: defaultLogger() })
    const error = new Error(`Boom ${Date.now()}`)
    const input = {
      [Symbol.iterator]: function * () {
        for (let i = 0; i < randomInt(1, 10); i++) {
          yield new Uint8ArrayList(randomBytes(randomInt(1, 128)))
        }
        throw error
      }
    }

    await expect(pipe(input, stream)).to.eventually.be.rejected
      .with.property('message', error.message)

    const resetMsg = msgs[msgs.length - 1]

    expect(resetMsg.id).to.equal(id)
    expectMsgType(resetMsg.type, MessageTypes.RESET_RECEIVER)
    expect(resetMsg).to.not.have.property('data')
  })

  it('should close for reading (remote close)', async () => {
    const dataLength = 5
    const {
      initiatorSentMessages,
      receiverSentMessages
    } = await streamPair(dataLength)

    // 1x NEW_STREAM, dataLength x MESSAGE_INITIATOR 1x CLOSE_INITIATOR
    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])

    // echoes the initiator messages back plus CLOSE_RECEIVER
    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.CLOSE_RECEIVER
    ])
  })

  it('should close for reading and writing (abort on local error)', async () => {
    const maxMsgs = 2
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 5
    const {
      initiatorSentMessages,
      receiverSentMessages
    } = await streamPair(dataLength, (initiatorMessage, initiator) => {
      messages++

      if (messages === maxMsgs) {
        initiator.abort(error)
      }
    })

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.RESET_INITIATOR
    ])

    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER
    ])
  })

  it('should close for reading and writing (abort on remote error)', async () => {
    const maxMsgs = 4
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 5
    const {
      initiatorSentMessages,
      receiverSentMessages
    } = await streamPair(dataLength, (initiatorMessage, initiator, recipient) => {
      messages++

      if (messages === maxMsgs) {
        recipient.abort(error)
      }
    })

    // All messages sent to recipient
    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])

    // Recipient reset after two messages
    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.RESET_RECEIVER
    ])
  })

  it('should close immediately for reading and writing (reset on local error)', async () => {
    const maxMsgs = 2
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 5
    const {
      initiatorSentMessages,
      receiverSentMessages
    } = await streamPair(dataLength, () => {
      messages++

      if (messages === maxMsgs) {
        throw error
      }
    })

    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.RESET_INITIATOR
    ])

    // Reset after two messages
    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER
    ])
  })

  it('should close immediately for reading and writing (reset on remote error)', async () => {
    const maxMsgs = 2
    const error = new Error(`Boom ${Date.now()}`)
    let messages = 0

    const dataLength = 5
    const {
      initiatorSentMessages,
      receiverSentMessages
    } = await streamPair(dataLength, () => {}, () => {
      messages++

      if (messages === maxMsgs) {
        throw error
      }
    })

    // All messages sent to recipient
    expect(initiatorSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.NEW_STREAM,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.MESSAGE_INITIATOR,
      MessageTypes.CLOSE_INITIATOR
    ])

    // Recipient reset after two messages
    expect(receiverSentMessages.map(m => m.type)).to.deep.equal([
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.MESSAGE_RECEIVER,
      MessageTypes.RESET_RECEIVER
    ])
  })

  it('should call onEnd only when both sides have closed', async () => {
    const send = async (msg: Message): Promise<void> => {
      if (msg.type === MessageTypes.CLOSE_INITIATOR) {
        // simulate remote closing connection
        await stream.closeRead()
      } else if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
        stream.sourcePush(msgToBuffer(msg))
      }
    }
    const id = randomInt(1000)
    const name = id.toString()
    const deferred = defer()
    const onEnd = (err?: any): void => { err != null ? deferred.reject(err) : deferred.resolve() }
    const stream = createStream({ id, name, send, onEnd, logger: defaultLogger() })
    const input = randomInput()

    void pipe(
      input,
      stream,
      drain
    )

    await deferred.promise
  })

  it('should call onEnd with error for local error', async () => {
    const send = async (): Promise<void> => {
      throw new Error(`Local boom ${Date.now()}`)
    }
    const id = randomInt(1000)
    const deferred = defer()
    const onEnd = (err?: any): void => { err != null ? deferred.reject(err) : deferred.resolve() }
    const stream = createStream({ id, send, onEnd, logger: defaultLogger() })
    const input = randomInput()

    pipe(
      input,
      stream,
      drain
    ).catch(() => {})

    await expect(deferred.promise).to.eventually.be.rejectedWith(/Local boom/)
  })

  it('should split writes larger than max message size', async () => {
    const messages: Message[] = []

    const send = async (msg: Message): Promise<void> => {
      if (msg.type === MessageTypes.CLOSE_INITIATOR) {
        await stream.closeRead()
      } else if (msg.type === MessageTypes.MESSAGE_INITIATOR) {
        messages.push(msg)
      }
    }
    const maxMsgSize = 10
    const id = randomInt(1000)
    const stream = createStream({ id, send, maxMsgSize, logger: defaultLogger() })

    await pipe(
      [
        new Uint8ArrayList(new Uint8Array(maxMsgSize * 2))
      ],
      stream,
      drain
    )

    expect(messages.length).to.equal(2)
    expect(messages[0]).to.have.nested.property('data.length', maxMsgSize)
    expect(messages[1]).to.have.nested.property('data.length', maxMsgSize)
  })

  it('should error on double sink', async () => {
    const send = async (): Promise<void> => {}
    const id = randomInt(1000)
    const stream = createStream({ id, send, logger: defaultLogger() })

    // first sink is ok
    void stream.sink([])

    // cannot sink twice
    await expect(stream.sink([]))
      .to.eventually.be.rejected.with.property('name', 'StreamStateError')
  })

  it('should error on double sink after sink has ended', async () => {
    const send = async (): Promise<void> => {}
    const id = randomInt(1000)
    const stream = createStream({ id, send, logger: defaultLogger() })

    // first sink is ok
    await stream.sink([])

    // cannot sink twice
    await expect(stream.sink([]))
      .to.eventually.be.rejected.with.property('name', 'StreamStateError')
  })

  it('should chunk really big messages', async () => {
    const msgs: Message[] = []
    const mockSend = async (msg: Message): Promise<void> => { msgs.push(msg) }
    const id = randomInt(1000)
    const name = `STREAM${Date.now()}`
    const maxMsgSize = 10
    const stream = createStream({ id, name, send: mockSend, maxMsgSize, logger: defaultLogger() })
    const input = [
      new Uint8Array(1024).map(() => randomInt(0, 255))
    ]
    const output = new Uint8ArrayList()

    await pipe(input, stream)

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
