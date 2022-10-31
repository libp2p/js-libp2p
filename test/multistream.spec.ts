/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import * as Varint from 'varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { reader } from 'it-reader'
import * as Multistream from '../src/multistream.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { pushable } from 'it-pushable'
import all from 'it-all'

describe('Multistream', () => {
  describe('Multistream.encode', () => {
    it('should encode data Buffer as a multistream-select message', () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)
      const output = Multistream.encode(input)

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])

      expect(output.slice()).to.eql(expected)
    })

    it('should encode data Uint8ArrayList as a multistream-select message', () => {
      const input = new Uint8ArrayList(uint8ArrayFromString('TEST'), uint8ArrayFromString(`${Date.now()}`))
      const output = Multistream.encode(input.slice())

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input.slice(),
        uint8ArrayFromString('\n')
      ])

      expect(output.slice()).to.eql(expected)
    })
  })

  describe('Multistream.write', () => {
    it('should encode and write a multistream-select message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)
      const writer = pushable<Uint8ArrayList | Uint8Array>()

      Multistream.write(writer, input)

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])

      writer.end()

      const output = await all(writer)
      expect(output.length).to.equal(1)
      expect(output[0].subarray()).to.equalBytes(expected)
    })
  })

  describe('Multistream.read', () => {
    it('should decode a multistream-select message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)

      const source = reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])])

      const output = await Multistream.read(source)
      expect(output.subarray()).to.equalBytes(input)
    })

    it('should throw for non-newline delimited message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)

      const source = reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length)),
        input
      ])])

      await expect(Multistream.read(source)).to.eventually.be.rejected()
        .with.property('code', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
    })

    it('should throw for a large message', async () => {
      const input = new Uint8Array(10000)
      input[input.length - 1] = '\n'.charCodeAt(0)

      const source = reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length)),
        input
      ])])

      await expect(Multistream.read(source)).to.eventually.be.rejected()
        .with.property('code', 'ERR_MSG_DATA_TOO_LONG')
    })

    it('should throw for a 0-length message', async () => {
      const input = new Uint8Array(0)

      const source = reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length)),
        input
      ])])

      await expect(Multistream.read(source)).to.eventually.be.rejected()
        .with.property('code', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
    })

    it('should be abortable', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)

      const source = reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])])

      const controller = new AbortController()
      controller.abort()

      await expect(Multistream.read(source, {
        signal: controller.signal
      })).to.eventually.be.rejected().with.property('code', 'ABORT_ERR')
    })
  })
})
