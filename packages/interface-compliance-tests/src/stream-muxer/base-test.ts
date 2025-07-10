import { expect } from 'aegir/chai'
import all from 'it-all'
import { byteStream } from 'it-byte-stream'
import map from 'it-map'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import defer from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isValidTick } from '../is-valid-tick.js'
import type { TestSetup } from '../index.js'
import type { Stream, StreamMuxerFactory } from '@libp2p/interface'
import type { Source } from 'it-stream-types'
import type { DeferredPromise } from 'p-defer'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('base', () => {
    it('should open a stream from the dialer', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onStreamPromise: DeferredPromise<Stream> = defer()
      const onStreamEndPromise: DeferredPromise<Stream> = defer()

      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound'
      })

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

      const dialerStream = await dialer.newStream()
      expect(dialer.streams).to.include(dialerStream)
      expect(isValidTick(dialerStream.timeline.open)).to.equal(true)

      const dialerBytes = byteStream(dialerStream)
      void dialerBytes.write(uint8ArrayFromString('hello'))

      const listenerStream = await onStreamPromise.promise
      expect(isValidTick(listenerStream.timeline.open)).to.equal(true)
      // Make sure the stream is being tracked
      expect(listener.streams).to.include(listenerStream)

      await dialerStream.close()
      await listenerStream.close()

      // Make sure stream is closed properly
      const endedStream = await onStreamEndPromise.promise
      expect(listener.streams).to.not.include(endedStream)

      if (endedStream.timeline.close == null) {
        throw new Error('timeline had no close time')
      }

      // Make sure the stream is removed from tracking
      expect(isValidTick(endedStream.timeline.close)).to.equal(true)

      await dialer.close()
      await listener.close()

      // ensure we have no streams left
      expect(dialer.streams).to.have.length(0)
      expect(listener.streams).to.have.length(0)
    })

    it('should open a stream from the listener', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onStreamPromise: DeferredPromise<Stream> = defer()
      const onStreamEndPromise: DeferredPromise<Stream> = defer()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onIncomingStream: (stream: Stream) => {
          onStreamPromise.resolve(stream)
        },
        onStreamEnd: (stream) => {
          onStreamEndPromise.resolve(stream)
        }
      })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound'
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const listenerStream = await listener.newStream()
      const listenerBytes = byteStream(listenerStream)
      void listenerBytes.write(uint8ArrayFromString('hello'))

      const dialerStream = await onStreamPromise.promise

      expect(isValidTick(dialerStream.timeline.open)).to.equal(true)
      expect(listener.streams).to.include(listenerStream)
      expect(isValidTick(listenerStream.timeline.open)).to.equal(true)

      await dialerStream.close()
      await listenerStream.close()

      // Make sure stream is closed properly
      const endedStream = await onStreamEndPromise.promise
      expect(dialer.streams).to.not.include(endedStream)

      if (endedStream.timeline.close == null) {
        throw new Error('timeline had no close time')
      }

      // Make sure the stream is removed from tracking
      expect(isValidTick(endedStream.timeline.close)).to.equal(true)

      await dialer.close()
      await listener.close()
    })

    it('should open a stream on both sides', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
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
        dialerInitiatorStream.close(),
        listenerInitiatorStream.close(),
        onDialerStreamPromise.promise.then(async stream => { await stream.close() }),
        onListenerStreamPromise.promise.then(async stream => { await stream.close() })
      ])

      await Promise.all([
        dialer.close(),
        listener.close()
      ])
    })

    it('should open a stream on one side, write, open a stream on the other side', async () => {
      const toString = (source: Source<Uint8ArrayList>): AsyncGenerator<string> => map(source, (u) => uint8ArrayToString(u.subarray()))
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
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

    it('should echo a small value via a pipe', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from([0, 1, 2, 3, 4])

      await pipe(
        [input],
        stream
      )
      await stream.close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })

    it('should echo a large value via a pipe', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from(new Array(1024 * 1024 * 10).fill(0))

      await pipe(
        [input],
        stream
      )
      await stream.close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })

    it('should echo a small value via sink', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from([0, 1, 2, 3, 4])

      await stream.sink([input])
      await stream.close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })

    it('should echo a large value via sink', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from(new Array(1024 * 1024 * 10).fill(0))

      await stream.sink([input])
      await stream.close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })

    it('should echo a small value via a pushable', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from([0, 1, 2, 3, 4])

      const pushable = byteStream(stream)
      await pushable.write(input)
      await pushable.unwrap().close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })

    it('should echo a large value via a pushable', async () => {
      const p = duplexPair<Uint8Array | Uint8ArrayList>()
      const onDialerStreamPromise: DeferredPromise<Stream> = defer()
      const onDataReceivedPromise: DeferredPromise<Uint8Array> = defer()
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
          void Promise.resolve().then(async () => {
            const output = new Uint8ArrayList()

            for await (const buf of stream.source) {
              output.append(buf)
            }

            onDataReceivedPromise.resolve(output.subarray())
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const input = Uint8Array.from(new Array(1024 * 1024 * 10).fill(0))

      const pushable = byteStream(stream)
      await pushable.write(input)
      await pushable.unwrap().close()

      expect(await onDataReceivedPromise.promise).to.equalBytes(input)
    })
  })
}
