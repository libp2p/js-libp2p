/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { Uint8ArrayList } from 'uint8arraylist'
import { duplexPair } from './fixtures/duplex-pair.js'
import randomBytes from 'iso-random-stream/src/random.js'
import * as mss from '../src/index.js'
import { duplexPair as byteStreamPair } from 'it-pair/duplex'

describe('Dialer and Listener integration', () => {
  it('should handle and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(pair[0], protocols),
      mss.handle(pair[1], selectedProtocol)
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => await all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle, ls and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair()

    const [listenerSelection, dialerSelection] = await Promise.all([
      mss.handle(pair[1], selectedProtocol),
      (async () => await mss.select(pair[0], selectedProtocol))()
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => await all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and select with Uint8Array streams', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = byteStreamPair<Uint8Array>()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(pair[0], protocols, {
        writeBytes: true
      }),
      mss.handle(pair[1], selectedProtocol, {
        writeBytes: true
      })
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => await all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })
})
