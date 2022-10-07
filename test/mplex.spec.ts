/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import { Mplex } from '../src/index.js'
import { CloseInitiatorMessage, Message, MessageInitiatorMessage, MessageTypes, NewStreamMessage } from '../src/message-types.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { encode } from '../src/encode.js'
import all from 'it-all'
import type { Source } from 'it-stream-types'
import delay from 'delay'
import pDefer from 'p-defer'
import { decode } from '../src/decode.js'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'

describe('mplex', () => {
  it('should restrict number of initiator streams per connection', async () => {
    const maxOutboundStreams = 10
    const factory = new Mplex({
      maxOutboundStreams
    })
    const muxer = factory.createStreamMuxer()

    // max out the streams for this connection
    for (let i = 0; i < maxOutboundStreams; i++) {
      await muxer.newStream()
    }

    // open one more
    expect(() => muxer.newStream()).to.throw().with.property('code', 'ERR_TOO_MANY_OUTBOUND_STREAMS')
  })

  it('should restrict number of recipient streams per connection', async () => {
    const maxInboundStreams = 10
    const factory = new Mplex({
      maxInboundStreams,
      disconnectThreshold: Infinity
    })
    const muxer = factory.createStreamMuxer()
    const stream = pushable()

    // max out the streams for this connection
    for (let i = 0; i < maxInboundStreams; i++) {
      const source: NewStreamMessage[] = [{
        id: i,
        type: 0,
        data: new Uint8ArrayList(uint8ArrayFromString('17'))
      }]

      const data = uint8ArrayConcat(await all(encode(source)))

      stream.push(data)
    }

    // simulate a new incoming stream
    const source: NewStreamMessage[] = [{
      id: 11,
      type: 0,
      data: new Uint8ArrayList(uint8ArrayFromString('17'))
    }]

    const data = uint8ArrayConcat(await all(encode(source)))

    stream.push(data)
    stream.end()

    const bufs: Uint8Array[] = []

    void Promise.resolve().then(async () => {
      for await (const buf of muxer.source) {
        bufs.push(buf)
      }
    })

    await muxer.sink(stream)

    const messages = await all(decode(bufs))

    expect(messages).to.have.nested.property('[0][0].id', 11, 'Did not specify the correct stream id')
    expect(messages).to.have.nested.property('[0][0].type', MessageTypes.RESET_RECEIVER, 'Did not reset the stream that tipped us over the inbound stream limit')
  })

  it('should reset a stream that fills the message buffer', async () => {
    let sent = 0
    const streamSourceError = pDefer<Error>()
    const maxStreamBufferSize = 1024 * 1024 // 1MB
    const id = 17

    // simulate a new incoming stream that sends lots of data
    const input: Source<Message> = (async function * send () {
      const newStreamMessage: NewStreamMessage = {
        id,
        type: MessageTypes.NEW_STREAM,
        data: new Uint8ArrayList(new Uint8Array(1024))
      }
      yield newStreamMessage

      await delay(10)

      for (let i = 0; i < 100; i++) {
        const dataMessage: MessageInitiatorMessage = {
          id,
          type: MessageTypes.MESSAGE_INITIATOR,
          data: new Uint8ArrayList(new Uint8Array(1024 * 1024))
        }
        yield dataMessage

        sent++

        await delay(10)
      }

      await delay(10)

      const closeMessage: CloseInitiatorMessage = {
        id,
        type: MessageTypes.CLOSE_INITIATOR
      }
      yield closeMessage
    })()

    // create the muxer
    const factory = new Mplex({
      maxStreamBufferSize
    })
    const muxer = factory.createStreamMuxer({
      onIncomingStream () {
        // do nothing with the stream so the buffer fills up
      },
      onStreamEnd (stream) {
        void all(stream.source)
          .then(() => {
            streamSourceError.reject(new Error('Stream source did not error'))
          })
          .catch(err => {
            // should have errored before all messages were sent
            expect(sent).to.equal(2)
            streamSourceError.resolve(err)
          })
      }
    })

    // collect outgoing mplex messages
    const muxerFinished = pDefer()
    let messages: Message[][] = []
    void Promise.resolve().then(async () => {
      messages = await all(decode(muxer.source))
      muxerFinished.resolve()
    })

    // the muxer processes the messages
    await muxer.sink(encode(input))

    // source should have errored with appropriate code
    const err = await streamSourceError.promise
    expect(err).to.have.property('code', 'ERR_STREAM_INPUT_BUFFER_FULL')

    // should have sent reset message to peer for this stream
    await muxerFinished.promise
    expect(messages).to.have.nested.property('[0][0].id', id)
    expect(messages).to.have.nested.property('[0][0].type', MessageTypes.RESET_RECEIVER)
  })
})
