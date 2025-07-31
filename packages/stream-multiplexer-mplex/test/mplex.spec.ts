/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { StreamCloseEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/test-utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { encode } from '../src/encode.js'
import { mplex } from '../src/index.js'
import { MessageTypes } from '../src/message-types.js'
import { decode } from './fixtures/decode.js'
import type { CloseInitiatorMessage, Message, MessageInitiatorMessage, NewStreamMessage } from '../src/message-types.js'

describe('mplex', () => {
  it('should reset a stream that fills the message buffer', async () => {
    const [outbound, inbound] = multiaddrConnectionPair()
    let sent = 0
    const streamCloseEventPromise = Promise.withResolvers<StreamCloseEvent>()
    const maxStreamBufferSize = 1024 * 1024 // 1MB
    const id = 17

    // create the muxer
    const factory = mplex({
      maxStreamBufferSize
    })()
    const muxer = factory.createStreamMuxer({
      maConn: outbound
    })

    muxer.addEventListener('stream', (evt) => {
      evt.detail.addEventListener('close', (evt) => {
        streamCloseEventPromise.resolve(evt)
      })
    })

    // collect outgoing mplex messages
    const muxerFinished = Promise.withResolvers<void>()
    const messages: Message[] = []

    Promise.resolve().then(async () => {
      const queue = pushable()

      inbound.addEventListener('message', (evt) => {
        queue.push(evt.data.subarray())
      })
      inbound.addEventListener('close', () => {
        queue.end()
        muxerFinished.resolve()
      })

      try {
        // collect as many messages as possible
        for await (const message of decode()(queue)) {
          messages.push(message)
        }
      } catch {}
    })

    // the muxer processes the messages
    Promise.resolve().then(async () => {
      const newStreamMessage: NewStreamMessage = {
        id,
        type: MessageTypes.NEW_STREAM,
        data: new Uint8ArrayList(new Uint8Array(1024))
      }
      inbound.send(encode(newStreamMessage))

      await delay(10)

      for (let i = 0; i < 100; i++) {
        const dataMessage: MessageInitiatorMessage = {
          id,
          type: MessageTypes.MESSAGE_INITIATOR,
          data: new Uint8ArrayList(new Uint8Array(1024 * 1024))
        }
        inbound.send(encode(dataMessage))

        sent++

        await delay(10)

        if (inbound.status === 'closed') {
          return
        }
      }

      await delay(10)

      const closeMessage: CloseInitiatorMessage = {
        id,
        type: MessageTypes.CLOSE_INITIATOR
      }
      inbound.send(encode(closeMessage))
    })

    // source should have errored with appropriate code
    const evt = await streamCloseEventPromise.promise
    expect(evt).to.have.nested.property('error.name', 'StreamInputBufferError', 'Stream source did not error')

    expect(sent).to.be.lessThan(10, 'should have errored before all 102 messages were sent')

    // should have sent reset message to peer for this stream
    await muxerFinished.promise
    expect(messages).to.have.nested.property('[0].id', id)
    expect(messages).to.have.nested.property('[0].type', MessageTypes.RESET_RECEIVER)
  })
})
