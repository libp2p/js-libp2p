/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import { pEvent } from 'p-event'
import pTimeout from 'p-timeout'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.js'

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol on outgoing stream', async () => {
      const protocol = '/echo/1.0.0'
      const [outgoingStream, incomingStream] = await streamPair()

      const handled = mss.handle(incomingStream, protocol)

      const selection = await mss.select(outgoingStream, protocol)
      expect(selection).to.equal(protocol)

      // Ensure stream is usable after selection - send data outgoing -> incoming
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      for (const buf of input) {
        if (!outgoingStream.send(buf)) {
          await pEvent(outgoingStream, 'drain')
        }
      }

      await Promise.all([
        outgoingStream.close(),
        incomingStream.close()
      ])

      const output = all(incomingStream)

      // wait for incoming end to have completed negotiation
      await handled

      expect(new Uint8ArrayList(...(await output)).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
    })

    it('should select from single protocol on incoming stream', async () => {
      const protocol = '/foo/1.0.0'
      const [outgoingStream, incomingStream] = await streamPair()
      const input = new Uint8ArrayList(
        randomBytes(10),
        randomBytes(64),
        randomBytes(3)
      )
      const receivedAllData = Promise.withResolvers<void>()

      const [selection] = await Promise.all([
        mss.handle(incomingStream, protocol),
        mss.select(outgoingStream, protocol, {
          negotiateFully: false
        })
      ])
      expect(selection).to.equal(protocol)

      await outgoingStream.close()

      const output = new Uint8ArrayList()
      outgoingStream.addEventListener('message', (evt) => {
        output.append(evt.data)

        if (output.byteLength === input.byteLength) {
          receivedAllData.resolve()
        }
      })

      // ensure stream is usable after selection
      // - send data incoming -> outgoing
      for (const buf of input) {
        if (!incomingStream.send(buf)) {
          await pEvent(incomingStream, 'drain')
        }
      }

      await Promise.all([
        pEvent(outgoingStream, 'close'),
        incomingStream.close(),
        receivedAllData.promise
      ])

      expect(output.subarray()).to.equalBytes(input.subarray())
    })

    it('should fail to select twice', async () => {
      const protocol = '/echo/1.0.0'
      const protocol2 = '/echo/2.0.0'
      const [outgoingStream, incomingStream] = await streamPair()

      void mss.handle(incomingStream, protocol)

      const selection = await mss.select(outgoingStream, protocol)
      expect(selection).to.equal(protocol)

      // A second select will timeout
      await pTimeout(mss.select(outgoingStream, [protocol, protocol2]), {
        milliseconds: 1e3
      })
        .then(() => expect.fail('should have timed out'), (err) => {
          expect(err).to.exist()
        })
    })

    it('should select from multiple protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const [outgoingStream, incomingStream] = await streamPair()

      void mss.handle(incomingStream, ['/nope/1.0.0', selectedProtocol])

      const selection = await mss.select(outgoingStream, protocols)
      expect(selection).to.equal(selectedProtocol)

      const output = all(incomingStream)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      for (const buf of input) {
        if (!outgoingStream.send(buf)) {
          await pEvent(outgoingStream, 'drain')
        }
      }

      await Promise.all([
        outgoingStream.close(),
        incomingStream.close()
      ])

      expect(new Uint8ArrayList(...(await output)).slice()).to.deep.equal(new Uint8ArrayList(...input).slice())
    })

    it('should throw if protocol selection fails', async () => {
      const protocol = ['/echo/2.0.0', '/echo/1.0.0']
      const [outgoingStream, incomingStream] = await streamPair()

      void mss.handle(incomingStream, ['/nope/1.0.0', '/still/nope/1.0.0'])

      await expect(mss.select(outgoingStream, protocol)).to.eventually.be.rejected
        .with.property('name', 'UnsupportedProtocolError')
    })
  })

  describe.skip('dialer optimistic select', () => {
    it('should optimistically select a single protocol when negotiateFully is false', async () => {
      const protocol = '/echo/1.0.0'
      const [outgoingStream, incomingStream] = await streamPair()

      const selection = await mss.select(outgoingStream, [protocol], {
        negotiateFully: false
      })
      expect(selection).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = all(incomingStream)

      for (const buf of input) {
        if (!outgoingStream.send(buf)) {
          await pEvent(outgoingStream, 'drain')
        }
      }
      await outgoingStream.close()

      expect(new Uint8ArrayList(...(await output)).subarray()).to.equalBytes(new Uint8ArrayList(
        Uint8Array.from([19]),
        uint8ArrayFromString(`${mss.PROTOCOL_ID}\n`),
        Uint8Array.from([12]),
        uint8ArrayFromString(`${protocol}\n`),
        ...input).subarray())
    })

    it('should not optimistically select a single protocol when negotiateFully is true', async () => {
      const protocols = ['/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const [outgoingStream, incomingStream] = await streamPair()

      void mss.handle(incomingStream, [selectedProtocol])

      const selection = await mss.select(outgoingStream, protocols, {
        negotiateFully: true
      })
      expect(selection).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = all(incomingStream)

      for (const buf of input) {
        if (!outgoingStream.send(buf)) {
          await pEvent(outgoingStream, 'drain')
        }
      }
      await outgoingStream.close()

      expect(new Uint8ArrayList(...(await output)).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })
  })
})
