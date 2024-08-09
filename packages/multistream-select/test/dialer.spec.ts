/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { logger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import pTimeout from 'p-timeout'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.js'

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol on outgoing stream', async () => {
      const protocol = '/echo/1.0.0'
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      const handled = mss.handle(incomingStream, protocol, {
        log: logger('mss:test-incoming')
      })

      const selection = await mss.select(outgoingStream, protocol, {
        log: logger('mss:test-outgoing')
      })
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection - send data outgoing -> incoming
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      void pipe(input, selection.stream, drain)

      // wait for incoming end to have completed negotiation
      await handled

      const output = await all(incomingStream.source)
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should select from single protocol on incoming stream', async () => {
      const protocol = '/echo/1.0.0'
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      void mss.select(outgoingStream, protocol, {
        log: logger('mss:test-outgoing'),
        negotiateFully: false
      })

      // have to interact with the stream to start protocol negotiation
      const outgoingSourceData = all(outgoingStream.source)

      const selection = await mss.handle(incomingStream, protocol, {
        log: logger('mss:test-incoming')
      })

      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection - send data incoming -> outgoing
      void pipe(input, selection.stream)

      const output = await outgoingSourceData
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should fail to select twice', async () => {
      const protocol = '/echo/1.0.0'
      const protocol2 = '/echo/2.0.0'
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      void mss.handle(incomingStream, protocol, {
        log: logger('mss:test-incoming')
      })

      const selection = await mss.select(outgoingStream, protocol, {
        log: logger('mss:test-outgoing')
      })
      expect(selection.protocol).to.equal(protocol)

      // A second select will timeout
      await pTimeout(mss.select(outgoingStream, [protocol, protocol2], {
        log: logger('mss:test-outgoing')
      }), {
        milliseconds: 1e3
      })
        .then(() => expect.fail('should have timed out'), (err) => {
          expect(err).to.exist()
        })
    })

    it('should select from multiple protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      void mss.handle(incomingStream, ['/nope/1.0.0', selectedProtocol], {
        log: logger('mss:test-incoming')
      })

      const selection = await mss.select(outgoingStream, protocols, {
        log: logger('mss:test-outgoing')
      })
      expect(protocols).to.have.length(2)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      void pipe(input, selection.stream)
      const output = await all(incomingStream.source)
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should throw if protocol selection fails', async () => {
      const protocol = ['/echo/2.0.0', '/echo/1.0.0']
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      void mss.handle(incomingStream, ['/nope/1.0.0', '/still/nope/1.0.0'], {
        log: logger('mss:test-incoming')
      })

      await expect(mss.select(outgoingStream, protocol, {
        log: logger('mss:test-outgoing')
      })).to.eventually.be.rejected
        .with.property('name', 'UnsupportedProtocolError')
    })
  })

  describe('dialer optimistic select', () => {
    it('should optimistically select a single protocol when negotiateFully is false', async () => {
      const protocol = '/echo/1.0.0'
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      const selection = await mss.select(outgoingStream, [protocol], {
        log: logger('mss:test-optimistic'),
        negotiateFully: false
      })
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      const [, output] = await Promise.all([
        pipe(input, selection.stream),
        all(incomingStream.source)
      ])

      expect(new Uint8ArrayList(...output).subarray()).to.equalBytes(new Uint8ArrayList(
        Uint8Array.from([19]),
        uint8ArrayFromString(`${mss.PROTOCOL_ID}\n`),
        Uint8Array.from([12]),
        uint8ArrayFromString(`${protocol}\n`),
        ...input).subarray())
    })

    it('should not optimistically select a single protocol when negotiateFully is true', async () => {
      const protocols = ['/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const [outgoingStream, incomingStream] = duplexPair<Uint8Array>()

      void mss.handle(incomingStream, [selectedProtocol], {
        log: logger('mss:test-incoming')
      })

      const selection = await mss.select(outgoingStream, protocols, {
        log: logger('mss:test-un-optimistic'),
        negotiateFully: true
      })
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      void pipe(input, selection.stream)
      const output = await all(incomingStream.source)
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })
  })
})
