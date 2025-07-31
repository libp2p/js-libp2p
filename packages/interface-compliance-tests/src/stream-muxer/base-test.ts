import { multiaddrConnectionPair } from '@libp2p/test-utils'
import { byteStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { raceEvent } from 'race-event'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { TestSetup } from '../index.js'
import type { Stream, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('base', () => {
    let dialer: StreamMuxer
    let listener: StreamMuxer

    beforeEach(async () => {
      const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

      const dialerFactory = await common.setup()
      dialer = dialerFactory.createStreamMuxer({
        maConn: outboundConnection
      })

      const listenerFactory = await common.setup()
      listener = listenerFactory.createStreamMuxer({
        maConn: inboundConnection
      })
    })

    afterEach(async () => {
      await dialer?.close()
      await listener?.close()
    })

    it('should have a protocol', async () => {
      expect(dialer.protocol).to.be.a('string')
    })

    it('should be open', async () => {
      expect(dialer.status).to.equal('open')
    })

    it('should be closing during closing', async () => {
      const closePromise = dialer.close()
      expect(dialer.status).to.equal('closing')

      await closePromise
    })

    it('should be closed after closing', async () => {
      await dialer.close()

      expect(dialer.status).to.equal('closed')
    })

    it('should open a stream', async () => {
      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        dialer.createStream(),
        raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail)
      ])

      const dialerBytes = byteStream(dialerStream)
      const listenerBytes = byteStream(listenerStream)

      const input = uint8ArrayFromString('hello')

      const [, output] = await Promise.all([
        dialerBytes.write(input),
        listenerBytes.read()
      ])

      expect(output?.subarray()).to.equalBytes(input.subarray())
    })

    it('should open a stream on both sides', async () => {
      const [
        dialerOutboundStream,
        listenerInboundStream,

        listenerOutboundStream,
        dialerInboundStream
      ] = await Promise.all([
        dialer.createStream(),
        raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),

        listener.createStream(),
        raceEvent<CustomEvent<Stream>>(dialer, 'stream').then(evt => evt.detail)
      ])

      const dialerOutboundBytes = byteStream(dialerOutboundStream)
      const listenerInboundBytes = byteStream(listenerInboundStream)

      const listenerOutboundBytes = byteStream(listenerOutboundStream)
      const dialerInboundBytes = byteStream(dialerInboundStream)

      const inputA = uint8ArrayFromString('hello')
      const inputB = uint8ArrayFromString('world')

      const [, outputA] = await Promise.all([
        dialerOutboundBytes.write(inputA),
        listenerInboundBytes.read(),

        listenerOutboundBytes.write(inputB),
        dialerInboundBytes.read()
      ])

      expect(outputA?.subarray()).to.equalBytes(inputA.subarray())
      expect(inputB?.subarray()).to.equalBytes(inputB.subarray())
    })

    it('should store a stream in the streams list', async () => {
      const [outboundConnection, inboundConnection] = multiaddrConnectionPair()

      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        maConn: outboundConnection
      })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        maConn: inboundConnection
      })

      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        dialer.createStream(),
        raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail)
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')
    })
  })
}
