/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import length from 'it-length'
import * as lengthPrefixed from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import pDefer from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { Message } from '../src/pb/message.js'
import { MAX_BUFFERED_AMOUNT, MAX_MESSAGE_SIZE, PROTOBUF_OVERHEAD, createStream } from '../src/stream.js'
import { mockDataChannel, receiveFinAck } from './util.js'

describe('Max message size', () => {
  it(`sends messages smaller or equal to ${MAX_MESSAGE_SIZE} bytes in one`, async () => {
    const sent: Uint8ArrayList = new Uint8ArrayList()
    const data = new Uint8Array(MAX_MESSAGE_SIZE - PROTOBUF_OVERHEAD)
    const p = pushable<Uint8Array>()
    const channel = mockDataChannel({
      send: (bytes) => {
        sent.append(bytes)
      }
    })

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE
    const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data }))
    expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE)
    const webrtcStream = createStream({
      channel,
      direction: 'outbound',
      closeTimeout: 1,
      logger: defaultLogger()
    })

    p.push(data)
    p.end()
    receiveFinAck(channel)
    await webrtcStream.sink(p)

    expect(length(sent)).to.be.gt(1)

    for (const buf of sent) {
      expect(buf.byteLength).to.be.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })

  it(`sends messages greater than ${MAX_MESSAGE_SIZE} bytes in parts`, async () => {
    const sent: Uint8ArrayList = new Uint8ArrayList()
    const data = new Uint8Array(MAX_MESSAGE_SIZE)
    const p = pushable<Uint8Array>()
    const channel = mockDataChannel({
      send: (bytes) => {
        sent.append(bytes)
      }
    })

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE + 1
    // const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data })).subarray()
    // expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE + 1)

    const webrtcStream = createStream({
      channel,
      direction: 'outbound',
      logger: defaultLogger()
    })

    p.push(data)
    p.end()
    receiveFinAck(channel)
    await webrtcStream.sink(p)

    expect(length(sent)).to.be.gt(1)

    for (const buf of sent) {
      expect(buf.byteLength).to.be.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })

  it('closes the stream if bufferamountlow timeout', async () => {
    const timeout = 100
    const closed = pDefer()
    const channel = mockDataChannel({
      send: () => {
        throw new Error('Expected to not send')
      },
      bufferedAmount: MAX_BUFFERED_AMOUNT + 1
    })
    const webrtcStream = createStream({
      bufferedAmountLowEventTimeout: timeout,
      closeTimeout: 1,
      channel,
      direction: 'outbound',
      onEnd: () => {
        closed.resolve()
      },
      logger: defaultLogger()
    })

    const t0 = Date.now()

    await expect(webrtcStream.sink([new Uint8Array(1)])).to.eventually.be.rejected
      .with.property('code', 'ERR_BUFFER_CLEAR_TIMEOUT')
    const t1 = Date.now()
    expect(t1 - t0).greaterThan(timeout)
    expect(t1 - t0).lessThan(timeout + 1000) // Some upper bound
    await closed.promise
    expect(webrtcStream.timeline.close).to.be.greaterThan(webrtcStream.timeline.open)
    expect(webrtcStream.timeline.abort).to.be.greaterThan(webrtcStream.timeline.open)
  })
})
