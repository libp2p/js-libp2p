/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { streamPair, lpStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { readString } from '../src/multistream.js'

describe('Multistream', () => {
  describe('Multistream.read', () => {
    it('should decode a multistream-select message', async () => {
      const input = `TEST${Date.now()}`

      const [outgoingStream, incomingStream] = await streamPair()
      const inputStream = lpStream(outgoingStream)
      const outputStream = lpStream(incomingStream)

      void inputStream.write(uint8ArrayFromString(`${input}\n`))

      const output = await readString(outputStream)
      expect(output).to.equal(input)
    })

    it('should throw for non-newline delimited message', async () => {
      const input = `TEST${Date.now()}`
      const inputBuf = uint8ArrayFromString(input)

      const [outgoingStream, incomingStream] = await streamPair()
      const inputStream = lpStream(outgoingStream)
      const outputStream = lpStream(incomingStream)

      void inputStream.write(inputBuf)

      await expect(readString(outputStream)).to.eventually.be.rejected()
        .with.property('name', 'InvalidMessageError')
    })

    it('should throw for a large message', async () => {
      const input = new Uint8Array(10000)
      input[input.length - 1] = '\n'.charCodeAt(0)

      const [outgoingStream, incomingStream] = await streamPair()
      const inputStream = lpStream(outgoingStream)
      const outputStream = lpStream(incomingStream, {
        maxDataLength: 9999
      })

      void inputStream.write(input)

      await expect(readString(outputStream)).to.eventually.be.rejected()
        .with.property('name', 'InvalidDataLengthError')
    })

    it('should throw for a 0-length message', async () => {
      const input = new Uint8Array(0)

      const [outgoingStream, incomingStream] = await streamPair()
      const inputStream = lpStream(outgoingStream)
      const outputStream = lpStream(incomingStream)

      void inputStream.write(input)

      await expect(readString(outputStream)).to.eventually.be.rejected()
        .with.property('name', 'InvalidMessageError')
    })

    it('should be abortable', async () => {
      const input = `TEST${Date.now()}`
      const inputBuf = uint8ArrayFromString(`${input}\n`)

      const controller = new AbortController()
      controller.abort()

      const [outgoingStream, incomingStream] = await streamPair()
      const inputStream = lpStream(outgoingStream)
      const outputStream = lpStream(incomingStream)

      void inputStream.write(inputBuf)

      await expect(readString(outputStream, {
        signal: controller.signal
      })).to.eventually.be.rejected.with.property('name', 'AbortError')
    })
  })
})
