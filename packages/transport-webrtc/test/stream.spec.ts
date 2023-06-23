/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { readableStreamFromGenerator } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import length from 'it-length'
import * as lengthPrefixed from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { Message } from '../src/pb/message.js'
import { createStream } from '../src/stream.js'

const mockDataChannel = (opts: { send: (bytes: Uint8Array) => void, bufferedAmount?: number }): RTCDataChannel => {
  return {
    readyState: 'open',
    close: () => {},
    addEventListener: (_type: string, _listener: () => void) => {},
    removeEventListener: (_type: string, _listener: () => void) => {},
    ...opts
  } as RTCDataChannel
}

const MAX_MESSAGE_SIZE = 16 * 1024

describe('Max message size', () => {
  it(`sends messages smaller or equal to ${MAX_MESSAGE_SIZE} bytes in one`, async () => {
    const sent: Uint8ArrayList = new Uint8ArrayList()
    const data = new Uint8Array(MAX_MESSAGE_SIZE - 5)
    const p = pushable()

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE
    const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data }))
    expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE)
    const webrtcStream = createStream({
      channel: mockDataChannel({
        send: (bytes) => {
          sent.append(bytes)
        }
      }),
      direction: 'outbound'
    })

    p.push(data)
    p.end()
    await readableStreamFromGenerator(p).pipeTo(webrtcStream.writable)

    // length(message) + message + length(FIN) + FIN
    expect(length(sent)).to.equal(4)

    for (const buf of sent) {
      expect(buf.byteLength).to.be.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })

  it(`sends messages greater than ${MAX_MESSAGE_SIZE} bytes in parts`, async () => {
    const sent: Uint8ArrayList = new Uint8ArrayList()
    const data = new Uint8Array(MAX_MESSAGE_SIZE)
    const p = pushable()

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE + 1
    // const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data })).subarray()
    // expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE + 1)

    const webrtcStream = createStream({
      channel: mockDataChannel({
        send: (bytes) => {
          sent.append(bytes)
        }
      }),
      direction: 'outbound'
    })

    p.push(data)
    p.end()
    await readableStreamFromGenerator(p).pipeTo(webrtcStream.writable)

    expect(length(sent)).to.equal(6)

    for (const buf of sent) {
      expect(buf.byteLength).to.be.lessThanOrEqual(MAX_MESSAGE_SIZE)
    }
  })

  it('closes the stream if bufferamountlow timeout', async () => {
    const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024 + 1
    const timeout = 100
    let closed = false
    const webrtcStream = createStream({
      dataChannelOptions: {
        bufferedAmountLowEventTimeout: timeout
      },
      channel: mockDataChannel({
        send: () => {
          throw new Error('Expected to not send')
        },
        bufferedAmount: MAX_BUFFERED_AMOUNT
      }),
      direction: 'outbound',
      onEnd: () => {
        closed = true
      }
    })

    const p = pushable()
    p.push(new Uint8Array(1))
    p.end()

    const t0 = Date.now()

    await expect(readableStreamFromGenerator(p).pipeTo(webrtcStream.writable)).to.eventually.be.rejected
      .with.property('message', 'Timed out waiting for DataChannel buffer to clear')
    const t1 = Date.now()
    expect(t1 - t0).greaterThan(timeout)
    expect(t1 - t0).lessThan(timeout + 1000) // Some upper bound
    expect(closed).true()
  })
})
