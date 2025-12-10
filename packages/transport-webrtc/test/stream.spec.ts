import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import * as lengthPrefixed from 'it-length-prefixed'
import { stubInterface } from 'sinon-ts'
import { MAX_MESSAGE_SIZE, PROTOBUF_OVERHEAD } from '../src/constants.js'
import { Message } from '../src/private-to-public/pb/message.js'
import { createStream } from '../src/stream.js'
import { isFirefox } from '../src/util.ts'

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
