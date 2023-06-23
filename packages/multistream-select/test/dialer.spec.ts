/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

import { pair, readableStreamFromArray, writeableStreamToArray } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import pTimeout from 'p-timeout'
import { unsigned } from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.js'
import { toStream } from './fixtures/to-stream.js'

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol', async () => {
      const protocol = '/echo/1.0.0'
      const duplex = pair()

      const selection = await mss.select(duplex, protocol)
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const output: Uint8Array[] = []
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      await new Blob(input).stream()
        .pipeThrough(selection)
        .pipeTo(
          new WritableStream({
            write: (chunk) => {
              output.push(chunk)
            }
          })
        )

      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })

    it.skip('should fail to select twice', async () => {
      const protocol = '/echo/1.0.0'
      const protocol2 = '/echo/2.0.0'
      const duplex = pair()

      const selection = await mss.select(duplex, protocol)
      expect(selection.protocol).to.equal(protocol)

      // A second select will timeout
      await pTimeout(mss.select(duplex, protocol2), {
        milliseconds: 1e3
      })
        .then(() => expect.fail('should have timed out'), (err) => {
          expect(err).to.exist()
        })
    })

    it('should select from multiple protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const streamData = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const mssRequest = uint8ArrayFromString(`${mss.PROTOCOL_ID}\n${protocols[0]}\n${protocols[1]}\n`)
      const input = [
        unsigned.encode(mssRequest.byteLength),
        mssRequest,
        ...streamData
      ]

      const output: Uint8Array[] = []

      const stream = toStream({
        readable: readableStreamFromArray(input),
        writable: writeableStreamToArray(output)
      })

      const selection = await mss.select(stream, [selectedProtocol])
      expect(protocols).to.have.length(2)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      await stream.readable.pipeTo(stream.writable)

      const mssResponse = uint8ArrayFromString(`${mss.PROTOCOL_ID}\n${protocols[1]}\n`)
      expect(uint8ArrayConcat([...output]))
        .to.equalBytes(uint8ArrayConcat([
          unsigned.encode(mssResponse.byteLength),
          mssResponse,
          ...streamData
        ]))
    })

    it('should throw if protocol selection fails', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = '/none-of-the-above/1.0.0'
      const streamData = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const mssRequest = uint8ArrayFromString(`${mss.PROTOCOL_ID}\n${protocols[0]}\n${protocols[1]}\n`)
      const input = [
        unsigned.encode(mssRequest.byteLength),
        mssRequest,
        ...streamData
      ]

      const stream = toStream({
        readable: readableStreamFromArray(input),
        writable: writeableStreamToArray([])
      })

      await expect(mss.select(stream, [selectedProtocol])).to.eventually.be.rejected().with.property('code', 'ERR_UNSUPPORTED_PROTOCOL')
    })
  })
/*
  describe('dialer.lazySelect', () => {
    it('should lazily select a single protocol', async () => {
      const protocol = '/echo/1.0.0'
      const duplex = pair<Uint8Array>()

      const selection = mss.lazySelect(duplex, protocol)
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = await pipe(input, selection.stream, async (source) => all(source))
      expect(new Uint8ArrayList(...output).slice()).to.eql(new Uint8ArrayList(...input).slice())
    })
  })
    */
})
