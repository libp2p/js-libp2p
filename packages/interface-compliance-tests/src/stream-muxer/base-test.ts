import { readableStreamFromArray, writeableStreamToArray } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import defer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isValidTick } from '../is-valid-tick.js'
import type { TestSetup } from '../index.js'
import type { RawStream, Stream } from '@libp2p/interface/connection'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'
import type { Duplex } from 'it-stream-types'
import type { DeferredPromise } from 'p-defer'

async function drainAndClose (stream: Duplex<any>): Promise<void> {
  await pipe([], stream, drain)
}

async function drainAndCloseStream (stream: Pick<Stream, 'close'>): Promise<void> {
  await stream.close()
}

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('base', () => {
    it('Open a stream from the dialer', async () => {
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const onStreamPromise: DeferredPromise<RawStream> = defer()
      const onStreamEndPromise: DeferredPromise<RawStream> = defer()

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          onStreamPromise.resolve(stream)
        },
        onStreamEnd: (stream) => {
          onStreamEndPromise.resolve(stream)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const conn = await dialer.newStream()
      expect(dialer.streams).to.include(conn)
      expect(isValidTick(conn.timeline.open)).to.equal(true)

      void drainAndCloseStream(conn)

      const stream = await onStreamPromise.promise
      expect(isValidTick(stream.timeline.open)).to.equal(true)
      // Make sure the stream is being tracked
      expect(listener.streams).to.include(stream)

      void drainAndCloseStream(stream)

      // Make sure stream is closed properly
      const endedStream = await onStreamEndPromise.promise
      expect(listener.streams).to.not.include(endedStream)

      if (endedStream.timeline.close == null) {
        throw new Error('timeline had no close time')
      }

      // Make sure the stream is removed from tracking
      expect(isValidTick(endedStream.timeline.close)).to.equal(true)

      await drainAndClose(dialer)
      await drainAndClose(listener)

      // ensure we have no streams left
      expect(dialer.streams).to.have.length(0)
      expect(listener.streams).to.have.length(0)
    })

    it('Open a stream from the listener', async () => {
      const p = duplexPair<Uint8Array>()
      const onStreamPromise: DeferredPromise<RawStream> = defer()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onIncomingStream: (stream: RawStream) => {
          onStreamPromise.resolve(stream)
        }
      })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({ direction: 'inbound' })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const listenerStream = await listener.newStream()
      expect(listener.streams).to.include(listenerStream)
      expect(isValidTick(listenerStream.timeline.open)).to.equal(true)
      void drainAndCloseStream(listenerStream)

      const dialerStream = await onStreamPromise.promise
      expect(isValidTick(dialerStream.timeline.open)).to.equal(true)
      void drainAndCloseStream(dialerStream)

      await drainAndClose(dialer)
      await drainAndClose(listener)
    })

    it('Open a stream on both sides', async () => {
      const p = duplexPair<Uint8Array>()
      const onDialerStreamPromise: DeferredPromise<RawStream> = defer()
      const onListenerStreamPromise: DeferredPromise<RawStream> = defer()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onIncomingStream: (stream) => {
          onDialerStreamPromise.resolve(stream)
        }
      })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          onListenerStreamPromise.resolve(stream)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const dialerInitiatorStream = await dialer.newStream()
      const listenerInitiatorStream = await listener.newStream()

      await Promise.all([
        drainAndCloseStream(dialerInitiatorStream),
        drainAndCloseStream(listenerInitiatorStream),
        onDialerStreamPromise.promise.then(async stream => { await drainAndCloseStream(stream) }),
        onListenerStreamPromise.promise.then(async stream => { await drainAndCloseStream(stream) })
      ])

      await Promise.all([
        dialer.close(),
        listener.close()
      ])

      expect(dialer.streams).to.be.empty()
      expect(listener.streams).to.be.empty()
    })

    it('Open a stream on one side, write, open a stream on the other side', async () => {
      const p = duplexPair<Uint8Array>()
      const onDialerStreamPromise: DeferredPromise<RawStream> = defer()
      const onListenerStreamPromise: DeferredPromise<RawStream> = defer()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onIncomingStream: (stream) => {
          onDialerStreamPromise.resolve(stream)
        }
      })
      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          onListenerStreamPromise.resolve(stream)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const dialerConn = await dialer.newStream()
      const listenerConn = await listener.newStream()

      await readableStreamFromArray([uint8ArrayFromString('hey')]).pipeTo(dialerConn.writable)
      await readableStreamFromArray([uint8ArrayFromString('hello')]).pipeTo(listenerConn.writable)

      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        onDialerStreamPromise.promise,
        onListenerStreamPromise.promise
      ])

      const listenerChunks: Uint8Array[] = []
      const dialerChunks: Uint8Array[] = []

      await Promise.all([
        listenerStream.readable.pipeTo(writeableStreamToArray(listenerChunks)),
        dialerStream.readable.pipeTo(writeableStreamToArray(dialerChunks))
      ])

      expect(listenerChunks.map(u => uint8ArrayToString(u))).to.be.eql(['hey'])
      expect(dialerChunks.map(u => uint8ArrayToString(u))).to.be.eql(['hello'])
    })
  })
}
