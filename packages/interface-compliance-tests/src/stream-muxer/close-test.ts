/* eslint max-nested-callbacks: ["error", 8] */
import { pbStream, readableStreamFromGenerator, writeableStreamToDrain, readableStreamFromArray } from '@libp2p/utils/stream'
import { abortableSource } from 'abortable-iterator'
import { expect } from 'aegir/chai'
import delay from 'delay'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import pDefer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message } from './fixtures/pb/message.js'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'

function randomBuffer (): Uint8Array {
  return uint8ArrayFromString(Math.random().toString())
}

async function * infiniteRandom (): AsyncGenerator<Uint8Array, void, unknown> {
  while (true) {
    yield randomBuffer()
    await delay(50)
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
          void stream.readable.pipeTo(stream.writable)
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      void Promise.all(
        streams.map(async stream => {
          await readableStreamFromGenerator(infiniteRandom())
            .pipeThrough(stream)
            .pipeTo(writeableStreamToDrain())
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
          void stream.readable.pipeTo(stream.writable).catch(() => {})
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      void Promise.all(
        streams.map(async stream => {
          await readableStreamFromGenerator(infiniteRandom())
            .pipeThrough(stream)
            .pipeTo(writeableStreamToDrain())
        })
      )

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      await dialer.close()

      expect(openedStreams, 'listener - number of opened streams should match number of calls to newStream').to.have.equal(expectedStreams)
      expect(dialer.streams, 'all tracked streams should be deleted after the muxer has called close').to.have.lengthOf(0)
    })

    it('calling abort closes streams', async () => {
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
          void stream.readable.pipeTo(stream.writable).catch(() => {})
        }
      })

      const p = duplexPair<Uint8Array>()
      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.newStream()))

      const streamPipes = streams.map(async stream => {
        await readableStreamFromGenerator(infiniteRandom())
          .pipeThrough(stream)
          .pipeTo(writeableStreamToDrain())
      })

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      // close _with an error_
      dialer.abort(new Error('Oh no!'))

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

      await dialer.close()

      expect(async () => dialer.newStream()).to.throw()

      expect(dialer.streams, 'closed muxer should have no streams').to.have.lengthOf(0)
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
          void stream.readable.pipeTo(stream.writable)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      const streams = await Promise.all(Array.from(Array(5), async () => dialer.newStream()))
      const controllers: AbortController[] = []

      const streamResults = streams.map(async stream => {
        const controller = new AbortController()
        controllers.push(controller)

        const abortableRand = abortableSource(infiniteRandom(), controller.signal, { abortCode: 'ERR_TEST_ABORT' })

        void readableStreamFromGenerator(abortableRand)
          .pipeThrough(stream)
          .pipeTo(writeableStreamToDrain())
      })

      // Pause, and then send some data and close the first stream
      await delay(50)
      await readableStreamFromArray([randomBuffer()])
        .pipeThrough(stream)
        .pipeTo(writeableStreamToDrain())

      // Abort all the other streams later
      await delay(50)
      controllers.forEach(c => { c.abort() })

      // These should now all resolve without error
      await Promise.all(streamResults)
    })

    it('can close an inbound stream for writing', async () => {
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
            await stream.writable.close()

            try {
              await readableStreamFromArray([randomBuffer()]).pipeTo(stream.writable)
            } catch (err: any) {
              deferred.resolve(err)
            }

            deferred.reject(new Error('should have errored'))
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      await readableStreamFromArray(data).pipeTo(stream.writable)

      const err = await deferred.promise
      expect(err).to.have.property('message').that.matches(/closed/)
    })

    it('can close an outbound stream for writing', async () => {
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const data = [randomBuffer(), randomBuffer()]

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void stream.readable.pipeTo(stream.writable)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      await stream.writable.close()

      await expect(readableStreamFromArray(data).pipeTo(stream.writable))
        .to.eventually.be.rejected.with.property('message').that.matches(/closed/)
    })

    it.skip('can close an inbound stream for reading', async () => {
      const deferred = pDefer<any>()

      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void Promise.resolve().then(async () => {
            await stream.readable.cancel()

            try {
              await readableStreamFromArray([randomBuffer()]).pipeThrough(stream).pipeTo(writeableStreamToDrain())
            } catch (err: any) {
              deferred.resolve(err)
            }

            deferred.reject(new Error('should have errored'))
          })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      await stream.writable.close()

      const err = await deferred.promise
      expect(err).to.have.property('message').that.matches(/closed/)
    })

    it.skip('can close an outbound stream for reading', async () => {
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          void stream.readable.pipeTo(stream.writable)
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const stream = await dialer.newStream()
      await stream.readable.cancel()

      await expect(readableStreamFromArray([randomBuffer()]).pipeThrough(stream).pipeTo(writeableStreamToDrain()))
        .to.eventually.be.rejected.with.property('message').that.matches(/ReadableStream is canceled/)
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

      await stream.close()
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
      await stream.writable.close()
      await stream.readable.cancel()

      await deferred.promise
    })

    it('can close a stream gracefully', async () => {
      const deferred = pDefer<Message>()

      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })

      const listenerFactory = await common.setup()
      const listener = listenerFactory.createStreamMuxer({
        direction: 'inbound',
        onIncomingStream: (stream) => {
          const pb = pbStream(stream)
          void pb.read(Message)
            .then(async message => {
              deferred.resolve(message)
              await pb.unwrap().close()
            })
            .catch(err => {
              deferred.reject(err)
            })
        }
      })

      void pipe(p[0], dialer, p[0])
      void pipe(p[1], listener, p[1])

      const message = {
        message: 'hello world',
        value: 5,
        flag: true
      }

      const stream = await dialer.newStream()
      const pb = pbStream(stream)

      await pb.write(message, Message)
      await pb.unwrap().close()

      await expect(deferred.promise).to.eventually.deep.equal(message)
    })
  })
}
