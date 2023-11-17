/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { logger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { lpStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as Multistream from '../src/multistream.js'

describe('Multistream', () => {
  describe('Multistream.write', () => {
    it('should encode and write a multistream-select message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)
      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1])

      void Multistream.write(inputStream, input, {
        log: logger('mss:test')
      })

      const output = await outputStream.read()
      expect(output.subarray()).to.equalBytes(input)
    })
  })

  describe('Multistream.read', () => {
    it('should decode a multistream-select message', async () => {
      const input = `TEST${Date.now()}`
      const inputBuf = uint8ArrayFromString(input)

      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1])

      void inputStream.write(uint8ArrayFromString(`${input}\n`))

      const output = await Multistream.read(outputStream)
      expect(output.subarray()).to.equalBytes(inputBuf)
    })

    it('should throw for non-newline delimited message', async () => {
      const input = `TEST${Date.now()}`
      const inputBuf = uint8ArrayFromString(input)

      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1])

      void inputStream.write(inputBuf)

      await expect(Multistream.read(outputStream)).to.eventually.be.rejected()
        .with.property('code', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
    })

    it('should throw for a large message', async () => {
      const input = new Uint8Array(10000)
      input[input.length - 1] = '\n'.charCodeAt(0)

      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1], {
        maxDataLength: 100
      })

      void inputStream.write(input)

      await expect(Multistream.read(outputStream)).to.eventually.be.rejected()
        .with.property('code', 'ERR_MSG_DATA_TOO_LONG')
    })

    it('should throw for a 0-length message', async () => {
      const input = new Uint8Array(0)

      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1])

      void inputStream.write(input)

      await expect(Multistream.read(outputStream)).to.eventually.be.rejected()
        .with.property('code', 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
    })

    it('should be abortable', async () => {
      const input = `TEST${Date.now()}`
      const inputBuf = uint8ArrayFromString(`${input}\n`)

      const controller = new AbortController()
      controller.abort()

      const duplexes = duplexPair<Uint8Array>()
      const inputStream = lpStream(duplexes[0])
      const outputStream = lpStream(duplexes[1])

      void inputStream.write(inputBuf)

      await expect(Multistream.read(outputStream, {
        signal: controller.signal,
        log: logger('mss:test')
      })).to.eventually.be.rejected.with.property('name', 'AbortError')
    })
  })
})
