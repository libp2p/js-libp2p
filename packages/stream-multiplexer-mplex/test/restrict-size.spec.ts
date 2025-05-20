/* eslint-env mocha */

import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import drain from 'it-drain'
import each from 'it-foreach'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import { encode } from '../src/encode.js'
import { MessageTypes } from '../src/message-types.js'
import { decode } from './fixtures/decode.js'
import type { Message } from '../src/message-types.js'

describe('restrict size', () => {
  it('should throw when size is too big', async () => {
    const maxSize = 32

    const input: Message[] = [
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(8)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(maxSize)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(64)) }
    ]

    const output: Message[] = []

    try {
      await pipe(
        input,
        encode,
        decode(maxSize),
        (source) => each(source, chunk => {
          output.push(chunk)
        }),
        async (source) => { await drain(source) }
      )
    } catch (err: any) {
      expect(err).to.have.property('name', 'InvalidMessageError')
      expect(output).to.have.length(3)
      expect(output[0]).to.deep.equal(input[0])
      expect(output[1]).to.deep.equal(input[1])
      expect(output[2]).to.deep.equal(input[2])
      return
    }
    throw new Error('did not restrict size')
  })

  it('should allow message with no data property', async () => {
    const message: Message = {
      id: 4,
      type: MessageTypes.CLOSE_RECEIVER
    }
    const input: Message[] = [message]

    const output = await pipe(
      input,
      encode,
      decode(32),
      async (source) => all(source)
    )
    expect(output).to.deep.equal(input)
  })

  it('should throw when unprocessed message queue size is too big', async () => {
    const maxMessageSize = 32
    const maxUnprocessedMessageQueueSize = 64

    const input: Message[] = [
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) },
      { id: 0, type: 1, data: new Uint8ArrayList(randomBytes(16)) }
    ]

    const output: Message[] = []

    try {
      await pipe(
        input,
        encode,
        async function * (source) {
          // make one big buffer
          yield new Uint8ArrayList(...(await all(source))).subarray()
        },
        decode(maxMessageSize, maxUnprocessedMessageQueueSize),
        (source) => each(source, chunk => {
          output.push(chunk)
        }),
        async (source) => { await drain(source) }
      )
    } catch (err: any) {
      expect(err).to.have.property('name', 'InvalidMessageError')
      expect(output).to.have.length(0)
      return
    }
    throw new Error('did not restrict size')
  })

  it('should throw when unprocessed message queue size is too big because of garbage', async () => {
    const maxMessageSize = 32
    const maxUnprocessedMessageQueueSize = 64
    const input = randomBytes(maxUnprocessedMessageQueueSize + 1)
    const output: Message[] = []

    try {
      await pipe(
        [input],
        decode(maxMessageSize, maxUnprocessedMessageQueueSize),
        (source) => each(source, chunk => {
          output.push(chunk)
        }),
        async (source) => { await drain(source) }
      )
    } catch (err: any) {
      expect(err).to.have.property('name', 'InvalidMessageError')
      expect(output).to.have.length(0)
      return
    }
    throw new Error('did not restrict size')
  })
})
