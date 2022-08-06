/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import { reader } from 'it-reader'
import all from 'it-all'
import * as Lp from 'it-length-prefixed'
import * as Multistream from '../src/multistream.js'
import randomBytes from 'iso-random-stream/src/random.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as mss from '../src/index.js'
import map from 'it-map'
import type { Duplex } from 'it-stream-types'

describe('Listener', () => {
  describe('listener.handle', () => {
    it('should handle a protocol', async () => {
      const protocol = '/echo/1.0.0'
      const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
      let output: Uint8ArrayList[] = []

      const duplex: Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> = {
        sink: async source => {
          const read = reader(source)
          let msg: string

          // First message will be multistream-select header
          msg = await Multistream.readString(read)
          expect(msg).to.equal(mss.PROTOCOL_ID)

          // Second message will be protocol
          msg = await Multistream.readString(read)
          expect(msg).to.equal(protocol)

          // Rest is data
          output = await all(read)
        },
        source: (function * () {
          yield Multistream.encode(uint8ArrayFromString(mss.PROTOCOL_ID))
          yield Multistream.encode(uint8ArrayFromString(protocol))
          yield * input
        })()
      }

      const selection = await mss.handle(duplex, protocol)
      expect(selection.protocol).to.equal(protocol)

      await pipe(selection.stream, selection.stream)

      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should reject unhandled protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const handledProtocols = ['/test/1.0.0', protocols[protocols.length - 1]]
      const handledProtocol = protocols[protocols.length - 1]
      const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
      let output: Uint8ArrayList[] = []

      const duplex: Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> = {
        sink: async source => {
          const read = reader(source)
          let msg: string

          // First message will be multistream-select header
          msg = await Multistream.readString(read)
          expect(msg).to.equal(mss.PROTOCOL_ID)

          // Second message will be na
          msg = await Multistream.readString(read)
          expect(msg).to.equal('na')

          // Third message will be handledProtocol
          msg = await Multistream.readString(read)
          expect(msg).to.equal(handledProtocol)

          // Rest is data
          output = await all(read)
        },
        source: (function * () {
          yield Multistream.encode(uint8ArrayFromString(mss.PROTOCOL_ID))
          for (const protocol of protocols) {
            yield Multistream.encode(uint8ArrayFromString(protocol))
          }
          yield * input
        })()
      }

      const selection = await mss.handle(duplex, handledProtocols)
      expect(selection.protocol).to.equal(handledProtocol)

      await pipe(selection.stream, selection.stream)

      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it('should handle ls', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const handledProtocols = ['/test/1.0.0', protocols[protocols.length - 1]]
      const handledProtocol = protocols[protocols.length - 1]
      const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
      let output: Uint8ArrayList[] = []

      const duplex: Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> = {
        sink: async source => {
          const read = reader(source)
          let msg: string

          // First message will be multistream-select header
          msg = await Multistream.readString(read)
          expect(msg).to.equal(mss.PROTOCOL_ID)

          // Second message will be ls response
          const buf = await Multistream.read(read)

          const protocolsReader = reader([buf])

          // Decode each of the protocols from the reader
          const lsProtocols = await pipe(
            protocolsReader,
            Lp.decode(),
            // Stringify and remove the newline
            (source) => map(source, (buf) => uint8ArrayToString(buf.subarray()).trim()),
            async (source) => await all(source)
          )

          expect(lsProtocols).to.deep.equal(handledProtocols)

          // Third message will be handledProtocol
          msg = await Multistream.readString(read)
          expect(msg).to.equal(handledProtocol)

          // Rest is data
          output = await all(read)
        },
        source: (function * () {
          yield Multistream.encode(uint8ArrayFromString(mss.PROTOCOL_ID))
          yield Multistream.encode(uint8ArrayFromString('ls'))
          yield Multistream.encode(uint8ArrayFromString(handledProtocol))
          yield * input
        })()
      }

      const selection = await mss.handle(duplex, handledProtocols)
      expect(selection.protocol).to.equal(handledProtocol)

      await pipe(selection.stream, selection.stream)

      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })
  })
})
