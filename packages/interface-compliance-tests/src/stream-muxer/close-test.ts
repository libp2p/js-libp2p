/* eslint max-nested-callbacks: ["error", 8] */
import { multiaddrConnectionPair, echo, pbStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import map from 'it-map'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message } from './fixtures/pb/message.js'
import type { TestSetup } from '../index.js'
import type { MultiaddrConnection, Stream, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'

function randomBuffer (): Uint8Array {
  return uint8ArrayFromString(Math.random().toString())
}

async function * infiniteRandom (): AsyncGenerator<Uint8ArrayList, void, unknown> {
  while (true) {
    await delay(10)
    yield new Uint8ArrayList(randomBuffer())
  }
}

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('close', () => {
    let outboundConnection: MultiaddrConnection
    let inboundConnection: MultiaddrConnection
    let dialer: StreamMuxer
    let listener: StreamMuxer

    beforeEach(async () => {
      [outboundConnection, inboundConnection] = multiaddrConnectionPair()

      const dialerFactory = await common.setup()
      dialer = dialerFactory.createStreamMuxer(outboundConnection)

      const listenerFactory = await common.setup()
      listener = listenerFactory.createStreamMuxer(inboundConnection)
    })

    afterEach(async () => {
      await dialer?.close()
      await listener?.close()
    })

    it('closing underlying MultiaddrConnection closes streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5

      listener.addEventListener('stream', (evt) => {
        openedStreams++

        echo(evt.detail)
      })

      const streams = await Promise.all(
        Array(expectedStreams).fill(0).map(async () => dialer.createStream())
      )

      void Promise.all(
        streams.map(async stream => {
          for await (const buf of infiniteRandom()) {
            if (stream.status !== 'open') {
              return
            }

            const sendMore = stream.send(buf)

            if (!sendMore) {
              await pEvent(stream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }
        })
      )

      expect(dialer.streams).to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)
      await inboundConnection.close()
      await outboundConnection.close()
      await delay(50)

      expect(openedStreams).to.have.equal(expectedStreams)
      expect(dialer.streams).to.have.lengthOf(0)
    })

    it('calling close closes streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5

      listener.addEventListener('stream', (evt) => {
        openedStreams++

        echo(evt.detail)
      })

      const streams = await Promise.all(Array(expectedStreams).fill(0).map(async () => dialer.createStream()))

      void Promise.all(
        streams.map(async stream => {
          for await (const buf of infiniteRandom()) {
            if (stream.status !== 'open') {
              return
            }

            const sendMore = stream.send(buf)

            if (!sendMore) {
              await pEvent(stream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }
        })
      )
        .catch(() => {
          // calling .send on a closed stream will throw so swallow any errors
        })

      expect(dialer.streams, 'dialer - number of opened streams should match number of calls to newStream').to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)

      await dialer.close()

      await delay(50)

      expect(openedStreams, 'listener - number of opened streams should match number of calls to newStream').to.have.equal(expectedStreams)
      expect(dialer.streams, 'all tracked streams should be deleted after the muxer has called close').to.have.lengthOf(0)
    })

    it('calling abort aborts streams', async () => {
      let openedStreams = 0
      const expectedStreams = 5

      listener.addEventListener('stream', (evt) => {
        openedStreams++

        echo(evt.detail)
      })

      const streams = await Promise.all(
        Array(expectedStreams).fill(0).map(async () => dialer.createStream())
      )

      const streamPipes = streams.map(async stream => {
        for await (const buf of infiniteRandom()) {
          if (stream.writeStatus !== 'writable') {
            break
          }

          const sendMore = stream.send(buf)

          if (!sendMore) {
            await pEvent(stream, 'drain', {
              rejectionEvents: ['close']
            })
          }
        }
      })

      expect(dialer.streams).to.have.lengthOf(expectedStreams, 'dialer - number of opened streams should match number of calls to createStream')

      const timeoutError = new Error('timeout')

      await Promise.all([
        // Pause, and then close the dialer
        delay(50).then(() => {
          // close _with an error_
          dialer.abort(new Error('Oh no!'))
        }),
        ...streamPipes.map(async pipe => {
          try {
            await Promise.race([
              pipe,
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  reject(timeoutError)
                }, 70)
              })
            ])
            expect.fail('stream pipe with infinite source should never return')
          } catch (e) {
            if (e === timeoutError) {
              expect.fail('expected stream pipe to throw an error after muxer closed with error')
            }
          }
        })
      ])

      expect(openedStreams).to.equal(expectedStreams, 'listener - number of opened streams should match number of calls to createStream')
      expect(dialer.streams).to.have.lengthOf(0, 'all tracked streams should be deleted after the muxer has called close')
    })

    it('calling newStream after close throws an error', async () => {
      await dialer.close()
      await expect(dialer.createStream()).to.eventually.rejected.with.property('name', 'MuxerClosedError')
      expect(dialer.streams).to.have.lengthOf(0, 'closed muxer should have no streams')
    })

    it('closing one of the muxed streams doesn\'t close others', async () => {
      const streamCount = 5
      const allStreamsOpen = Promise.withResolvers<void>()

      listener.addEventListener('stream', (evt) => {
        echo(evt.detail).catch(() => {})

        if (listener.streams.length === streamCount) {
          allStreamsOpen.resolve()
        }
      })

      const streams = await Promise.all(
        Array.from(Array(streamCount), async () => dialer.createStream())
      )
      await allStreamsOpen.promise

      expect(dialer.streams).to.have.lengthOf(streamCount)
      expect(listener.streams).to.have.lengthOf(streamCount)

      expect(dialer.streams.map(s => s.status)).to.deep.equal(new Array(streamCount).fill('open'))
      expect(listener.streams.map(s => s.status)).to.deep.equal(new Array(streamCount).fill('open'))

      const localStream = streams[0]
      const remoteStream = listener.streams[0]

      await Promise.all([
        pEvent(remoteStream, 'close'),
        pEvent(localStream, 'close'),
        localStream.close()
      ])

      expect(dialer.streams).to.have.lengthOf(streamCount - 1)
      expect(listener.streams).to.have.lengthOf(streamCount - 1)

      expect(dialer.streams.map(s => s.status)).to.deep.equal(new Array(streamCount - 1).fill('open'))
      expect(listener.streams.map(s => s.status)).to.deep.equal(new Array(streamCount - 1).fill('open'))
    })

    it('can close a stream for writing', async () => {
      const deferred = Promise.withResolvers<Error>()
      const data = [Uint8Array.from([0, 1, 2, 3, 4]), Uint8Array.from([5, 6, 7, 8, 9])]

      listener.addEventListener('stream', (evt) => {
        void Promise.resolve().then(async () => {
          try {
            // Immediate close for write
            await evt.detail.close({
              signal: AbortSignal.timeout(1_000)
            })

            const results = await all(map(evt.detail, (buf) => {
              return buf.subarray()
            }))

            expect(results).to.deep.equal(data)

            try {
              evt.detail.send(randomBuffer())
            } catch (err: any) {
              deferred.resolve(err)
            }

            throw new Error('should not support writing to closed writer')
          } catch (err) {
            deferred.reject(err)
          }
        })
      })

      const stream = await dialer.createStream()

      for (const buf of data) {
        if (!stream.send(buf)) {
          await pEvent(stream, 'drain', {
            rejectionEvents: [
              'close'
            ]
          })
        }
      }

      await stream.close({
        signal: AbortSignal.timeout(1_000)
      })

      const err = await deferred.promise
      expect(err).to.have.property('name', 'StreamStateError')
    })

    it('should emit a close event for closed streams not previously written', async () => {
      listener.addEventListener('stream', async (evt) => {
        void evt.detail.close()
      })

      const deferred = Promise.withResolvers<void>()
      const stream = await dialer.createStream()
      stream.addEventListener('close', () => {
        deferred.resolve()
      })

      await stream.close()
      await deferred.promise
    })

    it('should emit a close event for aborted streams not previously written', async () => {
      const deferred = Promise.withResolvers<void>()
      const stream = await dialer.createStream()
      stream.addEventListener('close', () => {
        deferred.resolve()
      })

      stream.abort(new Error('Urk!'))
      await deferred.promise
    })

    it('should wait for all data to be sent when closing streams', async () => {
      const deferred = Promise.withResolvers<Message>()

      listener.addEventListener('stream', (evt) => {
        const pb = pbStream(evt.detail)

        void pb.read(Message)
          .then(async message => {
            deferred.resolve(message)
            await evt.detail.close()
          })
          .catch(err => {
            deferred.reject(err)
          })
      })

      const message = {
        message: 'hello world',
        value: 5,
        flag: true
      }

      const stream = await dialer.createStream()

      const pb = pbStream(stream)
      await pb.write(message, Message)
      await stream.close()

      await expect(deferred.promise).to.eventually.deep.equal(message)
    })

    it('should remove a stream in the streams list after aborting', async () => {
      const [
        listenerStream,
        dialerStream
      ] = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')

      await Promise.all([
        pEvent(listenerStream, 'close'),
        // eslint-disable-next-line @typescript-eslint/await-thenable
        dialerStream.abort(new Error('Urk!'))
      ])

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })

    it('should remove a stream in the streams list after closing', async () => {
      const [
        listenerStream,
        dialerStream
      ] = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')

      await Promise.all([
        dialerStream.close(),
        listenerStream.close()
      ])

      await delay(10)

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })

    it('should not remove a half-closed outbound stream', async () => {
      const [
        listenerStream,
        dialerStream
      ] = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      await dialerStream.close()

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')
    })

    it('should not remove a half-closed inbound stream', async () => {
      const [
        listenerStream,
        dialerStream
      ] = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      await listenerStream.close()

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')
    })

    it('should remove a stream half closed from both ends', async () => {
      const [
        listenerStream,
        dialerStream
      ] = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')

      await listenerStream.close()

      expect(dialer.streams).to.include(dialerStream, 'dialer removed outbound stream before fully closing')
      expect(listener.streams).to.include(listenerStream, 'listener removed inbound stream before fully closing')

      await Promise.all([
        pEvent(listenerStream, 'close'),
        dialerStream.close()
      ])

      await delay(10)

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })
  })
}
