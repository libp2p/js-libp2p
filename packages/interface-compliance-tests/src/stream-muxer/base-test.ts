import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import map from 'it-map'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import defer from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isValidTick } from '../is-valid-tick.js'
import type { TestSetup } from '../index.js'
import type { Stream } from '@libp2p/interface/connection'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'
import type { Source, Duplex } from 'it-stream-types'
import type { DeferredPromise } from 'p-defer'

async function drainAndClose (stream: Duplex<any>): Promise<void> {
  await pipe([], stream, drain)
}

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('base', () => {
    it('Open a stream from the dialer', async () => {
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const onStreamPromise: DeferredPromise<Stream> = defer()
      const onStreamEndPromise: DeferredPromise<Stream> = defer()

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
      expect(isValidTick(conn.stat.timeline.open)).to.equal(true)

      void drainAndClose(conn)

      const stream = await onStreamPromise.promise
      expect(isValidTick(stream.stat.timeline.open)).to.equal(true)
      // Make sure the stream is being tracked
      expect(listener.streams).to.include(stream)

      void drainAndClose(stream)

      // Make sure stream is closed properly
      const endedStream = await onStreamEndPromise.promise
      expect(listener.streams).to.not.include(endedStream)

      if (endedStream.stat.timeline.close == null) {
        throw new Error('timeline had no close time')
      }

      // Make sure the stream is removed from tracking
      expect(isValidTick(endedStream.stat.timeline.close)).to.equal(true)

      await drainAndClose(dialer)
      await drainAndClose(listener)

      // ensure we have no streams left
      expect(dialer.streams).to.have.length(0)
      expect(listener.streams).to.have.length(0)
    })

    it('Open a stream from the listener', async () => {
      const p = duplexPair<Uint8Array>()
      const onStreamPromise: DeferredPromise<Stream> = defer()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onIncomingStream: (stream: Stream) => {
          onStreamPromise.resolve(stream)
        }
      })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({ direction: 'inbound' })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const conn = await listener.newStream()

      void drainAndClose(conn)

      const stream = await onStreamPromise.promise
      expect(isValidTick(stream.stat.timeline.open)).to.equal(true)
      expect(listener.streams).to.include(conn)
      expect(isValidTick(conn.stat.timeline.open)).to.equal(true)
      void drainAndClose(stream)

      await drainAndClose(dialer)
      await drainAndClose(listener)
    })

    it('Open a stream on both sides', async () => {
      const p = duplexPair<Uint8Array>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onListenerStreamPromise: DeferredPromise<Stream> = defer()
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
        drainAndClose(dialerInitiatorStream),
        drainAndClose(listenerInitiatorStream),
        onDialerStreamPromise.promise.then(async stream => { await drainAndClose(stream) }),
        onListenerStreamPromise.promise.then(async stream => { await drainAndClose(stream) })
      ])

      await Promise.all([
        drainAndClose(dialer),
        drainAndClose(listener)
      ])
    })

    it('Open a stream on one side, write, open a stream on the other side', async () => {
      const toString = (source: Source<Uint8ArrayList>): AsyncGenerator<string> => map(source, (u) => uint8ArrayToString(u.subarray()))
      const p = duplexPair<Uint8Array>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onListenerStreamPromise: DeferredPromise<Stream> = defer()
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

      void pipe([new Uint8ArrayList(uint8ArrayFromString('hey'))], dialerConn)
      void pipe([new Uint8ArrayList(uint8ArrayFromString('hello'))], listenerConn)

      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        onDialerStreamPromise.promise,
        onListenerStreamPromise.promise
      ])

      const [
        listenerChunks,
        dialerChunks
      ] = await Promise.all([
        pipe(listenerStream, toString, async (source) => all(source)),
        pipe(dialerStream, toString, async (source) => all(source))
      ])

      expect(listenerChunks).to.be.eql(['hey'])
      expect(dialerChunks).to.be.eql(['hello'])
    })
  })
}
