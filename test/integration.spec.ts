/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { Uint8ArrayList } from 'uint8arraylist'
import { duplexPair } from 'it-pair/duplex'
import randomBytes from 'iso-random-stream/src/random.js'
import { Dialer, Listener } from '../src/index.js'

describe('Dialer and Listener integration', () => {
  it('should handle and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair<Uint8Array>()

    const dialer = new Dialer(pair[0])
    const listener = new Listener(pair[1])

    const [dialerSelection, listenerSelection] = await Promise.all([
      dialer.select(protocols),
      listener.handle(selectedProtocol)
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

  it('should handle, ls and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair<Uint8Array>()

    const dialer = new Dialer(pair[0])
    const listener = new Listener(pair[1])

    const [listenerSelection, dialerSelection] = await Promise.all([
      listener.handle(selectedProtocol),
      (async () => await dialer.select(selectedProtocol))()
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
