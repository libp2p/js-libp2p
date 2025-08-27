/* eslint-env mocha */

import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import * as mss from '../src/index.js'

describe('Dialer and Listener integration', () => {
  it('should handle and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const [outgoingStream, incomingStream] = await streamPair()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(outgoingStream, protocols),
      mss.handle(incomingStream, selectedProtocol)
    ])

    expect(dialerSelection).to.equal(selectedProtocol)
    expect(listenerSelection).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      (async function () {
        for (const buf of input) {
          if (!outgoingStream.send(buf)) {
            await pEvent(outgoingStream, 'drain')
          }
        }

        await outgoingStream.close()

        return all(outgoingStream)
      }()),
      (async function () {
        for await (const buf of incomingStream) {
          if (!incomingStream.send(buf)) {
            await pEvent(incomingStream, 'drain')
          }
        }

        await incomingStream.close()
      }())
    ])

    expect(new Uint8ArrayList(...output[0]).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it('should handle, ls and select', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const [outgoingStream, incomingStream] = await streamPair()

    const [listenerSelection, dialerSelection] = await Promise.all([
      mss.handle(incomingStream, selectedProtocol),
      (async () => mss.select(outgoingStream, protocols))()
    ])

    expect(dialerSelection).to.equal(selectedProtocol)
    expect(listenerSelection).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
    const output = await Promise.all([
      (async function () {
        for (const buf of input) {
          outgoingStream.send(buf)
        }

        await outgoingStream.close()

        return all(outgoingStream)
      }()),
      (async function () {
        for await (const buf of incomingStream) {
          incomingStream.send(buf)
        }

        incomingStream.close()
      }())
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it('should handle and select with Uint8Array streams', async () => {
    const protocols = ['/echo/2.0.0', '/echo/1.0.0']
    const selectedProtocol = protocols[protocols.length - 1]
    const [outgoingStream, incomingStream] = await streamPair()

    const [dialerSelection, listenerSelection] = await Promise.all([
      mss.select(outgoingStream, protocols),
      mss.handle(incomingStream, selectedProtocol)
    ])

    expect(dialerSelection).to.equal(selectedProtocol)
    expect(listenerSelection).to.equal(selectedProtocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    const output = await Promise.all([
      (async function () {
        for (const buf of input) {
          outgoingStream.send(buf)
        }

        outgoingStream.close()

        return all(outgoingStream)
      }()),
      (async function () {
        for await (const buf of incomingStream) {
          incomingStream.send(buf)
        }

        incomingStream.close()
      }())
    ])
    expect(new Uint8ArrayList(...output[0]).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it.skip('should handle and optimistically select', async () => {
    const protocol = '/echo/1.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    // Since the stream is lazy, we need to write to it before handling
    const dialerOutPromise = (async function () {
      for (const buf of input) {
        outgoingStream.send(buf)
      }

      outgoingStream.close()

      return all(outgoingStream)
    }())

    const listenerSelection = await mss.handle(incomingStream, protocol)
    expect(listenerSelection).to.equal(protocol)

    await (async function () {
      for await (const buf of incomingStream) {
        incomingStream.send(buf)
      }

      incomingStream.close()
    }())

    const dialerOut = await dialerOutPromise
    expect(new Uint8ArrayList(...dialerOut).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it.skip('should handle and optimistically select that fails', async () => {
    const protocol = '/echo/1.0.0'
    const otherProtocol = '/echo/2.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // the listener handles the incoming stream
    void mss.handle(incomingStream, otherProtocol).catch(() => {})

    // should fail when we interact with the stream
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
    await expect(async function () {
      for (const buf of input) {
        outgoingStream.send(buf)
      }

      outgoingStream.close()

      return all(outgoingStream)
    }())
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')
  })

  it.skip('should handle and optimistically select only by reading', async () => {
    const protocol = '/echo/1.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    const [, dialerOut] = await Promise.all([
      // the listener handles the incoming stream
      mss.handle(incomingStream, protocol).then(async result => {
        // the listener writes to the incoming stream
        for (const buf of input) {
          incomingStream.send(buf)
        }
      }),

      // the dialer just reads from the stream
      pipe(outgoingStream, async source => all(source))
    ])

    expect(new Uint8ArrayList(...dialerOut).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it.skip('should handle and optimistically select only by writing', async () => {
    const protocol = '/echo/1.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    const [listenerOut] = await Promise.all([
      // the listener handles the incoming stream
      mss.handle(incomingStream, protocol).then(async result => {
        // the listener reads from the incoming stream
        return pipe(incomingStream, async source => all(source))
      }),
      Promise.resolve().then(async () => {
        // the dialer just writes to the stream
        for (const buf of input) {
          outgoingStream.send(buf)
        }
      })
    ])

    expect(new Uint8ArrayList(...listenerOut).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
  })

  it.skip('should handle and optimistically select only by reading that fails', async () => {
    const protocol = '/echo/1.0.0'
    const otherProtocol = '/echo/2.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    // lazy succeeds
    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // the listener handles the incoming stream
    void mss.handle(incomingStream, otherProtocol)

    // should fail when we interact with the stream
    await expect(pipe(outgoingStream, async source => all(source)))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')
  })

  it.skip('should abort an unhandled optimistically select', async () => {
    const protocol = '/echo/1.0.0'
    const [outgoingStream, incomingStream] = await streamPair()

    const dialerSelection = await mss.select(outgoingStream, [protocol], {
      negotiateFully: false
    })
    expect(dialerSelection).to.equal(protocol)

    // Ensure stream is usable after selection
    const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

    // Since the stream is lazy, we need to write to it before handling
    const dialerResultPromise = (async function () {
      for (const buf of input) {
        outgoingStream.send(buf)
      }

      return all(outgoingStream)
    }())

    // The error message from this varies depending on how much data got
    // written when the dialer receives the `na` response and closes the
    // stream, so we just assert that this rejects.
    await expect(mss.handle(incomingStream, '/unhandled/1.0.0')).to.eventually.be.rejected()

    // Dialer should fail to negotiate the single protocol
    await expect(dialerResultPromise).to.eventually.be.rejected()
      .with.property('name', 'UnsupportedProtocolError')
  })
})
