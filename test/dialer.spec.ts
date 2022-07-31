/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { Uint8ArrayList } from 'uint8arraylist'
import { pair } from 'it-pair'
import { reader } from 'it-reader'
import pTimeout from 'p-timeout'
import randomBytes from 'iso-random-stream/src/random.js'
import * as Multistream from '../src/multistream.js'
import { Dialer, PROTOCOL_ID } from '../src/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import map from 'it-map'
import type { Duplex } from 'it-stream-types'

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol', async () => {
      const protocol = '/echo/1.0.0'
      const duplex = pair<Uint8Array>()

      const mss = new Dialer(duplex)
      const selection = await mss.select(protocol)
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = await pipe(input, selection.stream, async (source) => await all(source))
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should fail to select twice', async () => {
      const protocol = '/echo/1.0.0'
      const protocol2 = '/echo/2.0.0'
      const duplex = pair<Uint8Array>()

      const mss = new Dialer(duplex)
      const selection = await mss.select(protocol)
      expect(selection.protocol).to.equal(protocol)

      // A second select will timeout
      await pTimeout(mss.select(protocol2), {
        milliseconds: 1e3
      })
        .then(() => expect.fail('should have timed out'), (err) => {
          expect(err).to.exist()
        })
    })

    it('should select from multiple protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const stream = pair<Uint8Array>()
      const duplex: Duplex<Uint8Array> = {
        sink: stream.sink,
        source: (async function * () {
          const source = reader(stream.source)
          let msg: string

          // First message will be multistream-select header
          msg = await Multistream.readString(source)
          expect(msg).to.equal(PROTOCOL_ID)

          // Echo it back
          yield Multistream.encode(uint8ArrayFromString(PROTOCOL_ID))

          // Reject protocols until selectedProtocol appears
          while (true) {
            msg = await Multistream.readString(source)
            if (msg === selectedProtocol) {
              yield Multistream.encode(uint8ArrayFromString(selectedProtocol))
              break
            } else {
              yield Multistream.encode(uint8ArrayFromString('na'))
            }
          }

          // Rest is data
          yield * map(source, (buf) => buf.slice())
        })()
      }

      const mss = new Dialer(duplex)
      const selection = await mss.select(protocols)
      expect(protocols).to.have.length(2)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = await pipe(input, selection.stream, async (source) => await all(source))
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should throw if protocol selection fails', async () => {
      const protocol = ['/echo/2.0.0', '/echo/1.0.0']
      const stream = pair<Uint8Array>()
      const duplex = {
        sink: stream.sink,
        source: (async function * () {
          const source = reader(stream.source)
          let msg: string

          // First message will be multistream-select header
          msg = await Multistream.readString(source)
          expect(msg).to.equal(PROTOCOL_ID)

          // Echo it back
          yield Multistream.encode(uint8ArrayFromString(PROTOCOL_ID))

          // Reject all protocols
          while (true) {
            msg = await Multistream.readString(source)
            yield Multistream.encode(uint8ArrayFromString('na'))
          }
        })()
      }

      const mss = new Dialer(duplex)
      await expect(mss.select(protocol)).to.eventually.be.rejected().with.property('code', 'ERR_UNSUPPORTED_PROTOCOL')
    })
  })
})
