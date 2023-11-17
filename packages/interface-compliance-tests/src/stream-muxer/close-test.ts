/* eslint max-nested-callbacks: ["error", 8] */
import { abortableSource } from 'abortable-iterator'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { pbStream } from 'it-protobuf-stream'
import toBuffer from 'it-to-buffer'
import pDefer from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message } from './fixtures/pb/message.js'
import type { TestSetup } from '../index.js'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'

function randomBuffer (): Uint8Array {
  return uint8ArrayFromString(Math.random().toString())
}

function infiniteRandom (): AsyncGenerator<Uint8ArrayList, void, unknown> {
  let done: Error | boolean = false

  const generator: AsyncGenerator<Uint8ArrayList, void, unknown> = {
    [Symbol.asyncIterator]: () => {
      return generator
    },
    async next () {
      await delay(10)

      if (done instanceof Error) {
        throw done
      }

      if (done) {
        return {
          done: true,
          value: undefined
        }
      }

      return {
        done: false,
        value: new Uint8ArrayList(randomBuffer())
      }
    },
    async return (): Promise<IteratorReturnResult<void>> {
      done = true

      return {
        done: true,
        value: undefined
      }
    },
    async throw (err: Error): Promise<IteratorReturnResult<void>> {
      done = err

      return {
        done: true,
        value: undefined
      }
    }
  }

  return generator
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
            infiniteRandom(),
            stream,
            drain
          )
        })
      )

      expect(dialer.streams).to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)
      await pipe([], dialer, drain)

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
            infiniteRandom(),
            stream,
            drain
          )
        })
      )

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      await dialer.close()

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
          infiniteRandom(),
          stream,
          drain
        )
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
          const abortableRand = abortableSource(infiniteRandom(), controller.signal, { abortCode: 'ERR_TEST_ABORT' })
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
            await stream.closeWrite()

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
      expect(err).to.have.property('code', 'ERR_SINK_INVALID_STATE')
    })

    it('can close a stream for reading', async () => {
      const deferred = pDefer<Uint8ArrayList[]>()
      const p = duplexPair<Uint8Array>()
      const dialerFactory = await common.setup()
      const dialer = dialerFactory.createStreamMuxer({ direction: 'outbound' })
      const data = [randomBuffer(), randomBuffer()].map(d => new Uint8ArrayList(d))
      const expected = toBuffer(data.map(d => d.subarray()))

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
      await stream.closeRead()

      // Source should be done
      void Promise.resolve().then(async () => {
        expect(await stream.source.next()).to.have.property('done', true)
        await stream.sink(data)
      })

      const results = await deferred.promise
      expect(toBuffer(results.map(b => b.subarray()))).to.equalBytes(expected)
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

      await stream.closeWrite()
      await stream.closeRead()
      await deferred.promise
    })

    it('should wait for all data to be sent when closing streams', async () => {
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
    /*
    it('should abort closing a stream with outstanding data to read', async () => {
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
              await pb.write(message, Message)
              await pb.unwrap().close()
              deferred.resolve(message)
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

      console.info('await write back')
      await deferred.promise

      // let message arrive
      await delay(100)

      // close should time out as message is never read
      await expect(pb.unwrap().close()).to.eventually.be.rejected
        .with.property('code', 'ERR_CLOSE_READ_ABORTED')
    })
    */
  })
}
