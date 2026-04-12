import { StreamCloseEvent, StreamMessageEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import { pEvent } from 'p-event'
import Sinon from 'sinon'
import { Uint8ArrayList } from 'uint8arraylist'
import { isValidTick } from '../is-valid-tick.ts'
import type { TestSetup } from '../index.ts'
import type { MultiaddrConnection, Stream, StreamMuxer, StreamMuxerFactory } from '@libp2p/interface'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  describe('streams', () => {
    let dialer: StreamMuxer
    let listener: StreamMuxer
    let outboundStream: Stream
    let inboundStream: Stream
    let streams: [Stream, Stream]
    let outboundConnection: MultiaddrConnection
    let inboundConnection: MultiaddrConnection

    beforeEach(async () => {
      ([outboundConnection, inboundConnection] = multiaddrConnectionPair())

      const dialerFactory = await common.setup()
      dialer = dialerFactory.createStreamMuxer(outboundConnection)

      const listenerFactory = await common.setup()
      listener = listenerFactory.createStreamMuxer(inboundConnection)

      streams = await Promise.all([
        pEvent<'stream', CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail),
        dialer.createStream()
      ])

      inboundStream = streams[0]
      outboundStream = streams[1]
    })

    afterEach(async () => {
      await dialer?.close()
      await listener?.close()
    })

    it('should have correct status after opening', () => {
      streams.forEach(stream => {
        expect(stream).to.have.property('status', 'open', `${stream.direction} stream status was incorrect`)
        expect(stream).to.have.property('writeStatus', 'writable', `${stream.direction} stream writeStatus was incorrect`)
        expect(stream).to.have.property('readStatus', 'readable', `${stream.direction} stream readStatus was incorrect`)
      })
    })

    it('should have correct timeline after opening', () => {
      streams.forEach(stream => {
        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.close', `${stream.direction} stream timeline.close was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.closeRead', `${stream.direction} stream timeline.closeRead was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.closeWrite', `${stream.direction} stream timeline.closeWrite was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.reset', `${stream.direction} stream timeline.reset was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.abort', `${stream.direction} stream timeline.abort was incorrect`)
      })
    })

    it('outbound stream sends data', async () => {
      const messageEventPromise = pEvent<'message', StreamMessageEvent>(inboundStream, 'message')
      const data = Uint8Array.from([0, 1, 2, 3, 4])

      outboundStream.send(data)

      const evt = await messageEventPromise
      expect(evt.data.subarray()).to.equalBytes(data)
    })

    it('inbound stream sends data', async () => {
      const messageEventPromise = pEvent<'message', StreamMessageEvent>(outboundStream, 'message')
      const data = Uint8Array.from([0, 1, 2, 3, 4])

      inboundStream.send(data)

      const evt = await messageEventPromise
      expect(evt.data.subarray()).to.equalBytes(data)
    })

    it('closes', async () => {
      const signal = AbortSignal.timeout(1_000)

      void outboundStream.close({
        signal
      })
      void inboundStream.close({
        signal
      })

      expect(outboundStream).to.have.property('status', 'open')
      expect(outboundStream).to.have.property('readStatus', 'readable')
      expect(outboundStream).to.have.property('writeStatus', 'closing')

      await Promise.all([
        pEvent(outboundStream, 'close', {
          signal
        }),
        pEvent(inboundStream, 'close', {
          signal
        })
      ])

      streams.forEach(stream => {
        expect(stream).to.have.property('status', 'closed', `${stream.direction} stream status was incorrect`)
        expect(stream).to.have.property('writeStatus', 'closed', `${stream.direction} stream writeStatus was incorrect`)
        expect(stream).to.have.property('readStatus', 'closed', `${stream.direction} stream readStatus was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)
        expect(isValidTick(stream.timeline.close)).to.equal(true, `${stream.direction} stream timeline.close was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.reset', `${stream.direction} stream timeline.reset was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.abort', `${stream.direction} stream timeline.abort was incorrect`)
      })
    })

    it('should send large amounts of data in both directions', async function () {
      const timeout = 360_000
      this.timeout(timeout)

      const sent = new Array(10)
        .fill(0)
        .map((val, index) => new Uint8Array(1024 * 1024).fill(index))

      // send data in both directions simultaneously
      const [
        outboundReceived,
        inboundReceived
      ] = await Promise.all([
        all(outboundStream),
        all(inboundStream),
        (async () => {
          for (const buf of sent) {
            if (!outboundStream.send(buf)) {
              await pEvent(outboundStream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }

          await outboundStream.close()
        })(),
        (async () => {
          for (const buf of sent) {
            if (!inboundStream.send(buf)) {
              await pEvent(inboundStream, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }

          await inboundStream.close()
        })()
      ])

      expect(new Uint8ArrayList(...outboundReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
      expect(new Uint8ArrayList(...inboundReceived)).to.have.property('byteLength', new Uint8ArrayList(...sent).byteLength)
    })

    it('closes for writing', async () => {
      const signal = AbortSignal.timeout(1_000)

      const eventPromise = pEvent(inboundStream, 'remoteCloseWrite')

      void outboundStream.close({
        signal
      })

      expect(outboundStream).to.have.property('writeStatus', 'closing')

      await delay(100)

      expect(inboundStream).to.have.property('readStatus', 'readable')

      await eventPromise

      streams.forEach(stream => {
        expect(stream).to.have.property('status', 'open', `${stream.direction} stream status was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.close', `${stream.direction} stream timeline.close was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.reset', `${stream.direction} stream timeline.reset was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.abort', `${stream.direction} stream timeline.abort was incorrect`)
      })

      expect(outboundStream).to.have.property('writeStatus', 'closed', 'outbound stream writeStatus was incorrect')
      expect(outboundStream).to.have.property('readStatus', 'readable', 'inbound stream readStatus was incorrect')

      expect(outboundStream).to.not.have.nested.property('timeline.closeRead', 'inbound stream timeline.closeRead was incorrect')

      expect(inboundStream).to.have.property('writeStatus', 'writable', 'inbound stream writeStatus was incorrect')
      expect(inboundStream).to.have.property('readStatus', 'readable', 'inbound stream readStatus was incorrect')
    })
    
    it('closes read only', async () => {
      expect(outboundStream).to.not.have.nested.property('timeline.close')

      await outboundStream.closeRead()

      expect(outboundStream).to.have.property('writeStatus', 'writable')
      expect(outboundStream).to.have.property('readStatus', 'closed')
    })

    it('aborts', async () => {
      const eventPromises = Promise.all([
        pEvent<'close', StreamCloseEvent>(outboundStream, 'close'),
        pEvent<'close', StreamCloseEvent>(inboundStream, 'close')
      ])

      const err = new Error('Urk!')
      outboundStream.abort(err)

      const [outboundEvent, inboundEvent] = await eventPromises

      streams.forEach(stream => {
        expect(stream).to.have.property('writeStatus', 'closed', `${stream.direction} stream writeStatus was incorrect`)
        expect(stream).to.have.property('readStatus', 'closed', `${stream.direction} stream readStatus was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.close', `${stream.direction} stream timeline.close was incorrect`)
      })

      expect(outboundStream).to.have.property('status', 'aborted', 'outbound stream status was incorrect')
      expect(isValidTick(outboundStream.timeline.close)).to.equal(true, 'outbound stream timeline.abort was incorrect')

      expect(inboundStream).to.have.property('status', 'reset', 'inbound stream status was incorrect')
      expect(isValidTick(inboundStream.timeline.close)).to.equal(true, 'inbound stream timeline.reset was incorrect')

      expect(() => outboundStream.send(Uint8Array.from([0, 1, 2, 3]))).to.throw()
        .with.property('name', 'StreamStateError', 'could still write to aborted stream')

      expect(() => inboundStream.send(Uint8Array.from([0, 1, 2, 3]))).to.throw()
        .with.property('name', 'StreamStateError', 'could still write to reset stream')

      expect(outboundEvent).to.have.property('error', err)
      expect(inboundEvent).to.have.nested.property('error.name', 'StreamResetError')
    })

    it('resets when remote aborts', async () => {
      expect(outboundStream).to.not.have.nested.property('timeline.close')

      const closePromise = pEvent(outboundStream, 'close')
      inboundStream.abort(new Error('Urk!'))

      await closePromise

      expect(outboundStream).to.have.property('status', 'reset')
      expect(isValidTick(outboundStream.timeline.close)).to.equal(true)
      expect(outboundStream.timeline.close).to.be.greaterThanOrEqual(outboundStream.timeline.open)
    })

    it('does not send close read when remote closes write', async () => {
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseReadSpy = Sinon.spy(outboundStream, 'sendCloseRead')

      await Promise.all([
        pEvent(outboundStream, 'remoteCloseWrite'),
        inboundStream.close()
      ])

      await delay(100)

      expect(sendCloseReadSpy.called).to.be.false()
    })

    it('does not send close read or write when remote resets', async () => {
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseReadSpy = Sinon.spy(outboundStream, 'sendCloseRead')
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseWriteSpy = Sinon.spy(outboundStream, 'sendCloseWrite')

      await Promise.all([
        pEvent(outboundStream, 'close'),
        // eslint-disable-next-line @typescript-eslint/await-thenable
        inboundStream.abort(new Error('Urk!'))
      ])

      await delay(100)

      await outboundStream.close()

      await delay(100)

      expect(sendCloseReadSpy.called).to.be.false()
      expect(sendCloseWriteSpy.called).to.be.false()
    })

    it('should wait for sending data to finish when closing gracefully', async () => {
      let sent = 0
      let received = 0
      let filledBuffer = false
      const receivedAll = Promise.withResolvers<boolean>()

      inboundStream.addEventListener('message', (evt) => {
        received += evt.data.byteLength

        if (filledBuffer && received === sent) {
          receivedAll.resolve(true)
        }
      })

      // fill the send buffer
      while (true) {
        const length = 1024
        sent += length
        const sendMore = outboundStream.send(new Uint8Array(length))

        if (sendMore === false) {
          filledBuffer = true
          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('writable')
      expect(outboundStream.writableNeedsDrain).to.be.true()

      // close gracefully
      await outboundStream.close()

      await expect(receivedAll.promise).to.eventually.be.true('did not receive all data')
    })

    it('should wait for sending data to finish when closing the writable end gracefully', async () => {
      let sent = 0
      let received = 0
      let filledBuffer = false
      const receivedAll = Promise.withResolvers<boolean>()

      inboundStream.addEventListener('message', (evt) => {
        received += evt.data.byteLength

        if (filledBuffer && received === sent) {
          receivedAll.resolve(true)
        }
      })

      // fill the send buffer
      while (true) {
        const length = 1024
        sent += length
        const sendMore = outboundStream.send(new Uint8Array(length))

        if (sendMore === false) {
          filledBuffer = true
          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('writable')
      expect(outboundStream.writableNeedsDrain).to.be.true()

      // close gracefully
      await outboundStream.close()

      await expect(receivedAll.promise).to.eventually.be.true('did not receive all data')
    })

    it('should abort close due to timeout with slow sender', async () => {
      const chunkSize = 1024

      // make the 'drain' event slow to fire
      // @ts-expect-error private fields
      outboundConnection.local.delay = 1000

      inboundStream = streams[0]
      outboundStream = streams[1]

      // ensure there are bytes left in the write queue
      // @ts-expect-error private fields
      outboundStream.maxMessageSize = chunkSize - 1

      // fill the send buffer
      while (true) {
        const sendMore = outboundStream.send(new Uint8Array(chunkSize * 10))

        if (sendMore === false) {
          expect(outboundStream).to.have.nested.property('writeBuffer.byteLength').that.is.greaterThan(0)

          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('writable')
      expect(outboundStream.writableNeedsDrain).to.be.true()

      // close stream, should be aborted as drain event will not have fired
      await expect(outboundStream.close({
        signal: AbortSignal.timeout(10)
      })).to.eventually.be.rejected
        .with.property('name', 'TimeoutError')
    })
  })
}
