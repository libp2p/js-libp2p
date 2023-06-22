/* eslint max-nested-callbacks: ["error", 8] */
import { abortableSource } from 'abortable-iterator'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import pDefer from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'

function randomBuffer (): Uint8Array {
  return uint8ArrayFromString(Math.random().toString())
}

const infiniteRandom = {
  [Symbol.asyncIterator]: async function * () {
    while (true) {
      yield new Uint8ArrayList(randomBuffer())
      await delay(50)
    }
  }
}

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('close', () => {
    it('closing underlying socket closes streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      // Listener is echo server :)
      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          openedStreams++
          void pipe(stream, stream)
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      void Promise.all(
        streams.map(async stream => {
          await pipe(
            infiniteRandom,
            stream,
            drain
          )
        })
      )

      expect(dialer.streams).to.have.lengthOf(expectedStreams)

      // Pause, and then send some data and close the dialer
      await delay(50)
      await pipe([randomBuffer()], dialer, drain)

      expect(openedStreams).to.have.equal(expectedStreams)
      expect(dialer.streams).to.have.lengthOf(0)
    })

    it('calling close closes streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      // Listener is echo server :)
      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          openedStreams++
          void pipe(stream, stream).catch(() => {})
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      void Promise.all(
        streams.map(async stream => {
          await pipe(
            infiniteRandom,
            stream,
            drain
          )
        })
      )

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      dialer.close()

      expect(openedStreams, 'listener - number of opened streams should match number of calls to newStream').to.have.equal(expectedStreams)
      expect(dialer.streams, 'all tracked streams should be deleted after the muxer has called close').to.have.lengthOf(0)
    })

    it('calling close with an error aborts streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      // Listener is echo server :)
      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          openedStreams++
          void pipe(stream, stream).catch(() => {})
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      const streamPipes = streams.map(async stream => {
        await pipe(
          infiniteRandom,
          stream,
          drain
        )
      })

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      // close _with an error_
      dialer.close(new Error())

      const timeoutError = new Error('timeout')
      for (const pipe of streamPipes) {
        try {
          await Promise.race([
            pipe,
            new Promise((_resolve, reject) => setTimeout(() => { reject(timeoutError) }, 20))
          ])
          expect.fail('stream pipe with infinite source should never return')
        } catch (e) {
          if (e === timeoutError) {
            expect.fail('expected stream pipe to throw an error after muxer closed with error')
          }
        }
      }

      expect(openedStreams, 'listener - number of opened streams should match number of calls to newStream').to.have.equal(expectedStreams)
      expect(dialer.streams, 'all tracked streams should be deleted after the muxer has called close').to.have.lengthOf(0)
    })

    it('calling newStream after close throws an error', async () => {
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      dialer.close()

      try {
        await dialer.newStream()
        expect.fail('newStream should throw if called after close')
      } catch (e) {
        expect(dialer.streams, 'closed muxer should have no streams').to.have.lengthOf(0)
      }
    })

    it('closing one of the muxed streams doesn\'t close others', async () => {
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      // Listener is echo server :)
      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void pipe(stream, stream).catch(() => {})
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const streams = await Promise.all(Array.from(Array(5), async () => dialer.newStream()))
      let closed = false
      const controllers: AbortController[] = []

      const streamResults = streams.map(async stream => {
        const controller = new AbortController()
        controllers.push(controller)

        try {
          const abortableRand = abortableSource(infiniteRandom, controller.signal, { abortCode: 'ERR_TEST_ABORT' })
          await pipe(abortableRand, stream, drain)
        } catch (err: any) {
          if (err.code !== 'ERR_TEST_ABORT') throw err
        }

        if (!closed) throw new Error('stream should not have ended yet!')
      })

      // Pause, and then send some data and close the first stream
      await delay(50)
      await pipe([new Uint8ArrayList(randomBuffer())], stream, drain)
      closed = true

      // Abort all the other streams later
      await delay(50)
      controllers.forEach(c => { c.abort() })

      // These should now all resolve without error
      await Promise.all(streamResults)
    })

    it('can close a stream for writing', async () => {
      const deferred = pDefer<Error>()

      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const data = [randomBuffer(), randomBuffer()]

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void Promise.resolve().then(async () => {
            // Immediate close for write
            stream.closeWrite()

            const results = await pipe(stream, async (source) => {
              const data = []
              for await (const chunk of source) {
                data.push(chunk.slice())
              }
              return data
            })
            expect(results).to.eql(data)

            try {
              await stream.sink([new Uint8ArrayList(randomBuffer())])
            } catch (err: any) {
              deferred.resolve(err)
            }

            deferred.reject(new Error('should not support writing to closed writer'))
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      await stream.sink(data)

      const err = await deferred.promise
      expect(err).to.have.property('message').that.matches(/stream closed for writing/)
    })

    it('can close a stream for reading', async () => {
      const deferred = pDefer<any>()

      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const data = [randomBuffer(), randomBuffer()].map(d => new Uint8ArrayList(d))

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void all(stream.source).then(deferred.resolve, deferred.reject)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      stream.closeRead()

      // Source should be done
      void Promise.resolve().then(async () => {
        expect(await stream.source.next()).to.have.property('done', true)
        await stream.sink(data)
      })

      const results = await deferred.promise
      expect(results).to.eql(data)
    })

    it('calls onStreamEnd for closed streams not previously written', async () => {
      const deferred = pDefer()

      const onStreamEnd = (): void => { deferred.resolve() }
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onStreamEnd
      })

      const stream = await dialer.newStream()

      stream.close()
      await deferred.promise
    })

    it('calls onStreamEnd for read and write closed streams not previously written', async () => {
      const deferred = pDefer()

      const onStreamEnd = (): void => { deferred.resolve() }
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({
        direction: 'outbound',
        onStreamEnd
      })

      const stream = await dialer.newStream()

      stream.closeWrite()
      stream.closeRead()
      await deferred.promise
    })
  })
}
