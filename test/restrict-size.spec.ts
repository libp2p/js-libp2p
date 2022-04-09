/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import drain from 'it-drain'
import each from 'it-foreach'
import { Message, MessageTypes } from '../src/message-types.js'
import { restrictSize } from '../src/restrict-size.js'

describe('restrict-size', () => {
  it('should throw when size is too big', async () => {
    const maxSize = 32

    const input: Message[] = [
      { id: 0, type: 1, data: await randomBytes(8) },
      { id: 0, type: 1, data: await randomBytes(maxSize) },
      { id: 0, type: 1, data: await randomBytes(64) },
      { id: 0, type: 1, data: await randomBytes(16) }
    ]

    const output: Message[] = []

    try {
      await pipe(
        input,
        restrictSize(maxSize),
        (source) => each(source, chunk => {
          output.push(chunk)
        }),
        async (source) => await drain(source)
      )
    } catch (err: any) {
      expect(err).to.have.property('code', 'ERR_MSG_TOO_BIG')
      expect(output).to.have.length(2)
      expect(output[0]).to.deep.equal(input[0])
      expect(output[1]).to.deep.equal(input[1])
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
      restrictSize(32),
      async (source) => await all(source)
    )
    expect(output).to.deep.equal(input)
  })
})
