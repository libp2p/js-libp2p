/* eslint-env mocha */

import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import { unsigned } from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.js'
import { toStream } from './fixtures/to-stream.js'

describe('Listener', () => {
  describe('listener.handle', () => {
    it('should handle a protocol', async () => {
      const protocol = '/echo/1.0.0'
      const mssMessage = uint8ArrayFromString(`${mss.PROTOCOL_ID}\n${protocol}\n`)
      const input = [
        unsigned.encode(mssMessage.byteLength),
        mssMessage,
        randomBytes(10),
        randomBytes(64),
        randomBytes(3)
      ]
      const output: Uint8Array[] = []
      let readCount = 0

      const stream = toStream({
        readable: new ReadableStream({
          pull: controller => {
            if (readCount === input.length) {
              controller.close()
              return
            }

            controller.enqueue(input[readCount])
            readCount++
          }
        }),
        writable: new WritableStream({
          write: chunk => {
            output.push(chunk.subarray())
          }
        })
      })

      const selection = await mss.handle(stream, protocol)
      expect(selection.protocol).to.equal(protocol)

      await selection.readable.pipeTo(selection.writable)

      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })
    /*
    it('should reject unhandled protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const handledProtocols = ['/test/1.0.0', protocols[protocols.length - 1]]
      const handledProtocol = protocols[protocols.length - 1]
      const input = [new Uint8ArrayList(randomBytes(10), randomBytes(64), randomBytes(3))]
      let output: Uint8ArrayList[] = []

      const duplex: Duplex<Generator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>> = {
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

      const duplex: Duplex<Generator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>> = {
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
            (source) => Lp.decode(source),
            // Stringify and remove the newline
            (source) => map(source, (buf) => uint8ArrayToString(buf.subarray()).trim()),
            async (source) => all(source)
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
      */
  })
})
