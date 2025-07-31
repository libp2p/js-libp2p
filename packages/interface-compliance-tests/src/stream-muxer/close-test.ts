/* eslint max-nested-callbacks: ["error", 8] */
import { multiaddrConnectionPair } from '@libp2p/test-utils'
import { echo, pbStream } from '@libp2p/utils'
import { abortableSource } from 'abortable-iterator'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import map from 'it-map'
import toBuffer from 'it-to-buffer'
import { raceEvent } from 'race-event'
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
              await raceEvent(stream, 'drain')
            }
          }
        })
      )

      expect(dialer.streams).to.have.lengthOf(expectedStreams)

      // Pause, and then close the dialer
      await delay(50)
      await outboundConnection.close()

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
              await raceEvent(stream, 'drain')
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
          const sendMore = stream.send(buf)

          if (!sendMore) {
            await raceEvent(stream, 'drain', undefined, {
              errorEvent: 'close'
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
      listener.addEventListener('stream', (evt) => {
        echo(evt.detail)
      })

      const stream = await dialer.createStream()
      const streams = await Promise.all(Array.from(Array(5), async () => dialer.createStream()))
      let closed = false
      const controllers: AbortController[] = []

      const streamResults = streams.map(async stream => {
        const controller = new AbortController()
        controllers.push(controller)

        try {
          const abortableRand = abortableSource(infiniteRandom(), controller.signal, {
            abortName: 'TestAbortError'
          })

          for await (const buf of abortableRand) {
            const sendMore = stream.send(buf)

            if (!sendMore) {
              await raceEvent(stream, 'drain', controller.signal)
            }
          }
        } catch (err: any) {
          if (err.name !== 'TestAbortError') { throw err }
        }

        if (!closed) { throw new Error('stream should not have ended yet!') }
      })

      // Pause, and then send some data and close the first stream
      await delay(50)
      stream.send(randomBuffer())
      await stream.close()
      closed = true

      // Abort all the other streams later
      await delay(50)
      controllers.forEach(c => { c.abort() })

      // These should now all resolve without error
      await Promise.all(streamResults)
    })

    it('can close a stream for writing', async () => {
      const deferred = Promise.withResolvers<Error>()
      const data = [randomBuffer(), randomBuffer()]

      listener.addEventListener('stream', (evt) => {
        void Promise.resolve().then(async () => {
          // Immediate close for write
          await evt.detail.closeWrite()

          const results = await all(map(evt.detail, (buf) => {
            return buf.subarray()
          }))
          expect(results).to.deep.equal(data)

          try {
            evt.detail.send(randomBuffer())
          } catch (err: any) {
            deferred.resolve(err)
          }

          deferred.reject(new Error('should not support writing to closed writer'))
        })
      })

      const stream = await dialer.createStream()
      data.forEach(buf => {
        stream.send(buf)
      })
      await stream.closeWrite()

      const err = await deferred.promise
      expect(err).to.have.property('name', 'StreamStateError')
    })

    it('can close a stream for reading', async () => {
      const deferred = Promise.withResolvers<Array<Uint8Array | Uint8ArrayList>>()
      const data = [randomBuffer(), randomBuffer()].map(d => new Uint8ArrayList(d))
      const expected = toBuffer(data.map(d => d.subarray()))

      listener.addEventListener('stream', (evt) => {
        all(evt.detail).then(deferred.resolve, deferred.reject)
      })

      const stream = await dialer.createStream()
      await stream.closeRead()

      expect(stream.readStatus).to.equal('closed')

      // Source should be done
      void Promise.resolve().then(async () => {
        for (const buf of data) {
          stream.send(buf)
        }

        await stream.closeWrite()
      })

      const results = await deferred.promise
      expect(toBuffer(results.map(b => b.subarray()))).to.equalBytes(expected)
    })

    it('should emit a close event for closed streams not previously written', async () => {
      const deferred = Promise.withResolvers<void>()
      const stream = await dialer.createStream()
      stream.addEventListener('close', () => {
        deferred.resolve()
      })

      await stream.close()
      await deferred.promise
    })

    it('should emit a close event for read and write closed streams not previously written', async () => {
      const deferred = Promise.withResolvers<void>()
      const stream = await dialer.createStream()
      stream.addEventListener('close', () => {
        deferred.resolve()
      })

      await stream.closeWrite()
      await stream.closeRead()
      await deferred.promise
    })

    it('should wait for all data to be sent when closing streams', async () => {
      const deferred = Promise.withResolvers<Message>()

      listener.addEventListener('stream', (evt) => {
        const pb = pbStream(evt.detail)

        void pb.read(Message)
          .then(async message => {
            deferred.resolve(message)
            await pb.unwrap().close()
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
      await pb.unwrap().close()

      await expect(deferred.promise).to.eventually.deep.equal(message)
    })

    it('should remove a stream in the streams list after closing from outbound', async () => {
      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        dialer.createStream(),
        raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail)
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')

      await dialerStream.close()
      await raceEvent(listenerStream, 'close')

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })

    it('should remove a stream in the streams list after closing from inbound', async () => {
      const [
        dialerStream,
        listenerStream
      ] = await Promise.all([
        dialer.createStream(),
        raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail)
      ])

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')

      await listenerStream.close()
      await raceEvent(dialerStream, 'close')

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })

    it('should not remove a half-closed outbound stream', async () => {
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

      await dialerStream.closeWrite()

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')
    })

    it('should not remove a half-closed inbound stream', async () => {
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

      await listenerStream.closeWrite()

      expect(dialer.streams).to.include(dialerStream, 'dialer did not store outbound stream')
      expect(listener.streams).to.include(listenerStream, 'listener did not store inbound stream')
    })

    it('should remove a stream half closed from both ends', async () => {
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

      await listenerStream.closeWrite()

      expect(dialer.streams).to.include(dialerStream, 'dialer removed outbound stream before fully closing')
      expect(listener.streams).to.include(listenerStream, 'listener removed inbound stream before fully closing')

      await dialerStream.closeWrite()
      await raceEvent(listenerStream, 'close')

      expect(dialer.streams).to.not.include(dialerStream, 'dialer did not remove outbound stream close')
      expect(listener.streams).to.not.include(listenerStream, 'listener did not remove inbound stream after close')
    })
  })
}
