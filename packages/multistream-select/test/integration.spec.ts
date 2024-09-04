/* eslint-env mocha */

import { logger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import * as mss from '../src/index.js'

describe('Dialer and Listener integration', () => {
  it('should handle and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair<Uint8Array | Uint8ArrayList>()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(pair[0], protocols, {
        log: logger('mss:test')
      }),
      mss.handle(pair[1], selectedProtocol, {
        log: logger('mss:test')
      })
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle, ls and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const [listenerSelection, dialerSelection] = await Promise.all([
      mss.handle(pair[1], selectedProtocol, {
        log: logger('mss:test')
      }),
      (async () => mss.select(pair[0], protocols, {
        log: logger('mss:test')
      }))()
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and select with Uint8Array streams', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(pair[0], protocols, {
        log: logger('mss:test')
      }),
      mss.handle(pair[1], selectedProtocol, {
        log: logger('mss:test')
      })
    ])

    expect(dialerSelection.protocol).to.equal(selectedProtocol)
    expect(listenerSelection.protocol).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    const output = await Promise.all([
      pipe(input, dialerSelection.stream, async (source) => all(source)),
      pipe(listenerSelection.stream, listenerSelection.stream)
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and optimistically select', async () => {
    const protocol = '/echo/1.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:test'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    // Since the stream is lazy, we need to write to it before handling
    const dialerOutPromise = pipe(input, dialerSelection.stream, async source => all(source))

    const listenerSelection = await mss.handle(pair[1], protocol, {
      log: logger('mss:test')
    })
    expect(listenerSelection.protocol).to.equal(protocol)

    await pipe(listenerSelection.stream, listenerSelection.stream)

    const dialerOut = await dialerOutPromise
    expect(new Uint8ArrayList(...dialerOut).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and optimistically select that fails', async () => {
    const protocol = '/echo/1.0.0'
    const otherProtocol = '/echo/2.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:test'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // the listener handles the incoming stream
    void mss.handle(pair[1], otherProtocol, {
      log: logger('mss:test')
    }).catch(() => {})

    // should fail when we interact with the stream
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    await expect(pipe(input, dialerSelection.stream, async source => all(source)))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')
  })

  it('should handle and optimistically select only by reading', async () => {
    const protocol = '/echo/1.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:dialer'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    const [, dialerOut] = await Promise.all([
      // the listener handles the incoming stream
      mss.handle(pair[1], protocol, {
        log: logger('mss:listener')
      }).then(async result => {
        // the listener writes to the incoming stream
        await pipe(input, result.stream)
      }),

      // the dialer just reads from the stream
      pipe(dialerSelection.stream, async source => all(source))
    ])

    expect(new Uint8ArrayList(...dialerOut).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and optimistically select only by writing', async () => {
    const protocol = '/echo/1.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:dialer'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    const [listenerOut] = await Promise.all([
      // the listener handles the incoming stream
      mss.handle(pair[1], protocol, {
        log: logger('mss:listener')
      }).then(async result => {
        // the listener reads from the incoming stream
        return pipe(result.stream, async source => all(source))
      }),
      Promise.resolve().then(async () => {
        // the dialer just writes to the stream
        await pair[0].sink(async function * () {
          yield * input
        }())
      })
    ])

    expect(new Uint8ArrayList(...listenerOut).slice()).to.eql(new Uint8ArrayList(...input).slice())
  })

  it('should handle and optimistically select only by reading that fails', async () => {
    const protocol = '/echo/1.0.0'
    const otherProtocol = '/echo/2.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    // lazy succeeds
    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:dialer'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // the listener handles the incoming stream
    void mss.handle(pair[1], otherProtocol, {
      log: logger('mss:listener')
    })

    // should fail when we interact with the stream
    await expect(pipe(dialerSelection.stream, async source => all(source)))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')
  })

  it('should abort an unhandled optimistically select', async () => {
    const protocol = '/echo/1.0.0'
    const pair = duplexPair<Uint8ArrayList | Uint8Array>()

    const dialerSelection = await mss.select(pair[0], [protocol], {
      log: logger('mss:test'),
      negotiateFully: false
    })
    expect(dialerSelection.protocol).to.equal(protocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    // Since the stream is lazy, we need to write to it before handling
    const dialerResultPromise = pipe(input, dialerSelection.stream, async source => all(source))

    // The error message from this varies depending on how much data got
    // written when the dialer receives the `na` response and closes the
    // stream, so we just assert that this rejects.
    await expect(mss.handle(pair[1], '/unhandled/1.0.0', {
      log: logger('mss:test')
    })).to.eventually.be.rejected()

    // Dialer should fail to negotiate the single protocol
    await expect(dialerResultPromise).to.eventually.be.rejected()
      .with.property('name', 'UnsupportedProtocolError')
  })
})
