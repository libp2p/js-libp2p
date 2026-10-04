import { lpStream, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.ts'

describe('Listener', () => {
  describe('listener.handle', () => {
    it('should handle a protocol', async () => {
      const protocol = '/echo/1.0.0'
      const input = [crypto.getRandomValues(new Uint8Array(10)), crypto.getRandomValues(new Uint8Array(64)), crypto.getRandomValues(new Uint8Array(3))]

      const [outgoingStream, incomingStream] = await streamPair()
      const outputStream = lpStream(incomingStream)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(outgoingStream, protocol)
      expect(selection).to.equal(protocol)

      const inputStream = lpStream(outgoingStream)
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[2]))
    })

    it('should reject unhandled protocols', async () => {
      const protocol = '/echo/1.0.0'
      const input = [crypto.getRandomValues(new Uint8Array(10)), crypto.getRandomValues(new Uint8Array(64)), crypto.getRandomValues(new Uint8Array(3))]

      const [outgoingStream, incomingStream] = await streamPair()
      const outputStream = lpStream(incomingStream)
      void drain(incomingStream)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('/not/supported/1.0.0\n'),
        uint8ArrayFromString('/also/not/supported/1.0.0\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(outgoingStream, protocol)
      expect(selection).to.equal(protocol)

      const inputStream = lpStream(outgoingStream)
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[2]))
    })

    it('should reject when unsupported protocols are ignored', async () => {
      const protocol = '/echo/1.0.0'
      const input = [crypto.getRandomValues(new Uint8Array(10)), crypto.getRandomValues(new Uint8Array(64)), crypto.getRandomValues(new Uint8Array(3))]

      const [outgoingStream, incomingStream] = await streamPair()
      const outputStream = lpStream(incomingStream)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('/not/supported/1.0.0\n\n'),
        ...input
      ])

      await expect(mss.handle(outgoingStream, protocol)).to.eventually.be.rejected()
    })

    it('should handle ls', async () => {
      const protocol = '/echo/1.0.0'
      const input = [crypto.getRandomValues(new Uint8Array(10)), crypto.getRandomValues(new Uint8Array(64)), crypto.getRandomValues(new Uint8Array(3))]

      const [outgoingStream, incomingStream] = await streamPair()
      const outputStream = lpStream(incomingStream)
      void drain(incomingStream)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('ls\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(outgoingStream, protocol)
      expect(selection).to.equal(protocol)

      const inputStream = lpStream(outgoingStream)
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.deep.equal(new Uint8ArrayList(input[2]))
    })
  })
})
