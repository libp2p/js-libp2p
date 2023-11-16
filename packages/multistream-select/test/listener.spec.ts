/* eslint-env mocha */

import { logger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import drain from 'it-drain'
import { lpStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as mss from '../src/index.js'

describe('Listener', () => {
  describe('listener.handle', () => {
    it('should handle a protocol', async () => {
      const protocol = '/echo/1.0.0'
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      const duplexes = duplexPair<Uint8Array>()
      const outputStream = lpStream(duplexes[1])
      void drain(duplexes[1].source)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(duplexes[0], protocol, {
        log: logger('test')
      })
      expect(selection.protocol).to.equal(protocol)

      const inputStream = lpStream(selection.stream)
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[2]))
    })

    it('should reject unhandled protocols', async () => {
      const protocol = '/echo/1.0.0'
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      const duplexes = duplexPair<Uint8Array>()
      const outputStream = lpStream(duplexes[1])
      void drain(duplexes[1].source)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('/not/supported/1.0.0\n'),
        uint8ArrayFromString('/also/not/supported/1.0.0\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(duplexes[0], protocol, {
        log: logger('test')
      })
      expect(selection.protocol).to.equal(protocol)

      const inputStream = lpStream(selection.stream)
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[2]))
    })

    it('should reject when unsupported protocols are ignored', async () => {
      const protocol = '/echo/1.0.0'
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      const duplexes = duplexPair<Uint8Array>()
      const outputStream = lpStream(duplexes[1])
      void drain(duplexes[1].source)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('/not/supported/1.0.0\n\n'),
        ...input
      ])

      await expect(mss.handle(duplexes[0], protocol, {
        log: logger('test')
      })).to.eventually.be.rejected()
    })

    it('should handle ls', async () => {
      const protocol = '/echo/1.0.0'
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]

      const duplexes = duplexPair<Uint8Array>()
      const outputStream = lpStream(duplexes[1])
      void drain(duplexes[1].source)

      void outputStream.writeV([
        uint8ArrayFromString(mss.PROTOCOL_ID + '\n'),
        uint8ArrayFromString('ls\n'),
        uint8ArrayFromString(protocol + '\n'),
        ...input
      ])

      const selection = await mss.handle(duplexes[0], protocol, {
        log: logger('test')
      })
      expect(selection.protocol).to.equal(protocol)

      const inputStream = lpStream(selection.stream)
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[0]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[1]))
      await expect(inputStream.read()).to.eventually.eql(new Uint8ArrayList(input[2]))
    })
  })
})
