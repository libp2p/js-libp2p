/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { expect } from 'aegir/chai'
import * as lengthPrefixed from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { Message } from '../src/pb/message'
import * as underTest from '../src/stream'

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
    const sent: Uint8Array[] = []
    const data = new Uint8Array(MAX_MESSAGE_SIZE - 5)
    const p = pushable()

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE
    const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data })).subarray()
    expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE)
    const webrtcStream = new underTest.WebRTCStream({
      channel: mockDataChannel({
        send: (bytes) => {
          sent.push(bytes)
          if (p.readableLength === 0) {
            webrtcStream.close()
          }
        }
      }),
      stat: underTest.defaultStat('outbound')
    })

    p.push(data)
    p.end()
    await webrtcStream.sink(p)
    expect(sent).to.deep.equals([messageLengthEncoded])
  })

  it(`sends messages greater than ${MAX_MESSAGE_SIZE} bytes in parts`, async () => {
    const sent: Uint8Array[] = []
    const data = new Uint8Array(MAX_MESSAGE_SIZE - 4)
    const p = pushable()

    // Make sure that the data that ought to be sent will result in a message with exactly MAX_MESSAGE_SIZE + 1
    const messageLengthEncoded = lengthPrefixed.encode.single(Message.encode({ message: data })).subarray()
    expect(messageLengthEncoded.length).eq(MAX_MESSAGE_SIZE + 1)

    const webrtcStream = new underTest.WebRTCStream({
      channel: mockDataChannel({
        send: (bytes) => {
          sent.push(bytes)
          if (p.readableLength === 0) {
            webrtcStream.close()
          }
        }
      }),
      stat: underTest.defaultStat('outbound')
    })

    p.push(data)
    p.end()
    await webrtcStream.sink(p)

    // Message is sent in two parts
    expect(sent).to.deep.equals([messageLengthEncoded.subarray(0, messageLengthEncoded.length - 1), messageLengthEncoded.subarray(messageLengthEncoded.length - 1)])
  })

  it('closes the stream if bufferamountlow timeout', async () => {
    const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024 + 1
    const timeout = 2000
    let closed = false
    const webrtcStream = new underTest.WebRTCStream({
      dataChannelOptions: { bufferedAmountLowEventTimeout: timeout },
      channel: mockDataChannel({
        send: () => {
          throw new Error('Expected to not send')
        },
        bufferedAmount: MAX_BUFFERED_AMOUNT
      }),
      stat: underTest.defaultStat('outbound'),
      closeCb: () => {
        closed = true
      }
    })

    const p = pushable()
    p.push(new Uint8Array(1))
    p.end()

    const t0 = Date.now()

    await expect(webrtcStream.sink(p)).to.eventually.be.rejected
      .with.property('message', 'Timed out waiting for DataChannel buffer to clear')
    const t1 = Date.now()
    expect(t1 - t0).greaterThan(timeout)
    expect(t1 - t0).lessThan(timeout + 1000) // Some upper bound
    expect(closed).true()
  })
})
