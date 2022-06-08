/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import { Mplex } from '../src/index.js'
import { Components } from '@libp2p/interfaces/components'
import type { NewStreamMessage } from '../src/message-types.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { encode } from '../src/encode.js'
import all from 'it-all'

describe('mplex', () => {
  it('should restrict number of initiator streams per connection', async () => {
    const maxStreamsPerConnection = 10
    const factory = new Mplex({
      maxStreamsPerConnection
    })
    const components = new Components()
    const muxer = factory.createStreamMuxer(components)

    // max out the streams for this connection
    for (let i = 0; i < maxStreamsPerConnection; i++) {
      muxer.newStream()
    }

    // open one more
    expect(() => muxer.newStream()).to.throw().with.property('code', 'ERR_TOO_MANY_STREAMS')
  })

  it('should restrict number of recipient streams per connection', async () => {
    const maxStreamsPerConnection = 10
    const factory = new Mplex({
      maxStreamsPerConnection
    })
    const components = new Components()
    const muxer = factory.createStreamMuxer(components)

    // max out the streams for this connection
    for (let i = 0; i < maxStreamsPerConnection; i++) {
      muxer.newStream()
    }

    // simulate a new incoming stream
    const source: NewStreamMessage[] = [{
      id: 17,
      type: 0,
      data: uint8ArrayFromString('17')
    }]

    const data = uint8ArrayConcat(await all(encode(source)))

    await muxer.sink([data])

    await expect(all(muxer.source)).to.eventually.be.rejected.with.property('code', 'ERR_TOO_MANY_STREAMS')
  })
})
