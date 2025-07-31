import { StreamCloseEvent, StreamMessageEvent } from '@libp2p/interface'
import { multiaddrConnectionPair } from '@libp2p/test-utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { raceEvent } from 'race-event'
import Sinon from 'sinon'
import { isValidTick } from '../is-valid-tick.ts'
import type { TestSetup } from '../index.ts'
import type { Stream, StreamMuxerFactory } from '@libp2p/interface'
import type { MultiaddrConnectionPairOptions } from '@libp2p/test-utils'

export default (common: TestSetup<StreamMuxerFactory>): void => {
  async function createStreamPair (opts?: MultiaddrConnectionPairOptions): Promise<[Stream, Stream]> {
    const [outboundConnection, inboundConnection] = multiaddrConnectionPair(opts)

    const dialerFactory = await common.setup()
    const dialer = dialerFactory.createStreamMuxer({
      maConn: outboundConnection
    })

    const listenerFactory = await common.setup()
    const listener = listenerFactory.createStreamMuxer({
      maConn: inboundConnection
    })

    return Promise.all([
      dialer.createStream(),
      raceEvent<CustomEvent<Stream>>(listener, 'stream').then(evt => evt.detail)
    ])
  }

  describe('streams', () => {
    let outboundStream: Stream
    let inboundStream: Stream
    let streams: [Stream, Stream]

    beforeEach(async () => {
      streams = await createStreamPair()

      outboundStream = streams[0]
      inboundStream = streams[1]
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
      const messageEventPromise = raceEvent<StreamMessageEvent>(inboundStream, 'message')
      const data = Uint8Array.from([0, 1, 2, 3, 4])

      outboundStream.send(data)

      const evt = await messageEventPromise
      expect(evt.data.subarray()).to.equalBytes(data)
    })

    it('inbound stream sends data', async () => {
      const messageEventPromise = raceEvent<StreamMessageEvent>(outboundStream, 'message')
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

      expect(outboundStream).to.have.property('status', 'closing')
      expect(outboundStream).to.have.property('readStatus', 'closing')
      expect(outboundStream).to.have.property('writeStatus', 'closing')

      await Promise.all([
        raceEvent(outboundStream, 'close', signal),
        raceEvent(inboundStream, 'close', signal)
      ])

      streams.forEach(stream => {
        expect(stream).to.have.property('status', 'closed', `${stream.direction} stream status was incorrect`)
        expect(stream).to.have.property('writeStatus', 'closed', `${stream.direction} stream writeStatus was incorrect`)
        expect(stream).to.have.property('readStatus', 'closed', `${stream.direction} stream readStatus was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)
        expect(isValidTick(stream.timeline.close)).to.equal(true, `${stream.direction} stream timeline.close was incorrect`)
        expect(isValidTick(stream.timeline.closeRead)).to.equal(true, `${stream.direction} stream timeline.closeRead was incorrect`)
        expect(isValidTick(stream.timeline.closeWrite)).to.equal(true, `${stream.direction} stream timeline.closeWrite was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.reset', `${stream.direction} stream timeline.reset was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.abort', `${stream.direction} stream timeline.abort was incorrect`)
      })
    })

    it('closes for reading', async () => {
      const signal = AbortSignal.timeout(1_000)

      void outboundStream.closeRead({
        signal
      })

      expect(outboundStream).to.have.property('readStatus', 'closing')
      expect(inboundStream).to.have.property('writeStatus', 'writable')

      await Promise.all([
        raceEvent(outboundStream, 'closeRead'),
        raceEvent(inboundStream, 'remoteClosedRead'),
        raceEvent(inboundStream, 'closeWrite')
      ])

      streams.forEach(stream => {
        expect(stream).to.have.property('status', 'open', `${stream.direction} stream status was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.close', `${stream.direction} stream timeline.close was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.reset', `${stream.direction} stream timeline.reset was incorrect`)
        expect(stream).to.not.have.nested.property('timeline.abort', `${stream.direction} stream timeline.abort was incorrect`)
      })

      expect(outboundStream).to.have.property('writeStatus', 'writable', 'outbound stream writeStatus was incorrect')
      expect(outboundStream).to.have.property('readStatus', 'closed', 'inbound stream readStatus was incorrect')

      expect(isValidTick(outboundStream.timeline.closeRead)).to.equal(true, 'inbound stream timeline.closeRead was incorrect')
      expect(outboundStream).to.not.have.nested.property('timeline.closeWrite', 'inbound stream timeline.closeWrite was incorrect')

      expect(inboundStream).to.have.property('writeStatus', 'closed', 'inbound stream writeStatus was incorrect')
      expect(inboundStream).to.have.property('readStatus', 'readable', 'inbound stream readStatus was incorrect')

      expect(inboundStream).to.not.have.nested.property('timeline.closeRead', 'inbound stream timeline.closeRead was incorrect')
      expect(isValidTick(inboundStream.timeline.closeWrite)).to.equal(true, 'inbound stream timeline.closeWrite was incorrect')
    })

    it('closes for writing', async () => {
      const signal = AbortSignal.timeout(1_000)

      void outboundStream.closeWrite({
        signal
      })

      expect(outboundStream).to.have.property('writeStatus', 'closing')
      expect(inboundStream).to.have.property('readStatus', 'readable')

      await Promise.all([
        raceEvent(outboundStream, 'closeWrite'),
        raceEvent(inboundStream, 'remoteClosedWrite'),
        raceEvent(inboundStream, 'closeRead')
      ])

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
      expect(isValidTick(outboundStream.timeline.closeWrite)).to.equal(true, 'inbound stream timeline.closeWrite was incorrect')

      expect(inboundStream).to.have.property('writeStatus', 'writable', 'inbound stream writeStatus was incorrect')
      expect(inboundStream).to.have.property('readStatus', 'closed', 'inbound stream readStatus was incorrect')

      expect(isValidTick(inboundStream.timeline.closeRead)).to.equal(true, 'inbound stream timeline.closeRead was incorrect')
      expect(inboundStream).to.not.have.nested.property('timeline.closeWrite', 'inbound stream timeline.closeWrite was incorrect')
    })

    it('aborts', async () => {
      const err = new Error('Urk!')
      outboundStream.abort(err)

      const [outboundEvent, inboundEvent] = await Promise.all([
        raceEvent<StreamCloseEvent>(outboundStream, 'close'),
        raceEvent<StreamCloseEvent>(inboundStream, 'close')
      ])

      streams.forEach(stream => {
        expect(stream).to.have.property('writeStatus', 'closed', `${stream.direction} stream writeStatus was incorrect`)
        expect(stream).to.have.property('readStatus', 'closed', `${stream.direction} stream readStatus was incorrect`)

        expect(isValidTick(stream.timeline.open)).to.equal(true, `${stream.direction} stream timeline.open was incorrect`)

        expect(stream).to.not.have.nested.property('timeline.close', `${stream.direction} stream timeline.close was incorrect`)
      })

      expect(outboundStream).to.have.property('status', 'aborted', 'outbound stream status was incorrect')
      expect(isValidTick(outboundStream.timeline.abort)).to.equal(true, 'outbound stream timeline.abort was incorrect')
      expect(outboundStream).to.not.have.nested.property('timeline.reset', 'outbound stream timeline.reset was incorrect')

      expect(inboundStream).to.have.property('status', 'reset', 'inbound stream status was incorrect')
      expect(inboundStream).to.not.have.nested.property('timeline.abort', 'outbound stream timeline.abort was incorrect')
      expect(isValidTick(inboundStream.timeline.reset)).to.equal(true, 'inbound stream timeline.reset was incorrect')

      expect(() => outboundStream.send(Uint8Array.from([0, 1, 2, 3]))).to.throw()
        .with.property('name', 'StreamStateError', 'could still write to aborted stream')

      expect(() => inboundStream.send(Uint8Array.from([0, 1, 2, 3]))).to.throw()
        .with.property('name', 'StreamStateError', 'could still write to reset stream')

      expect(outboundEvent).to.have.property('error', err)
      expect(inboundEvent).to.have.nested.property('error.name', 'StreamResetError')
    })

    it('does not send close read when remote closes write', async () => {
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseReadSpy = Sinon.spy(outboundStream, 'sendCloseRead')

      await inboundStream.closeWrite()
      await raceEvent(outboundStream, 'remoteClosedWrite')

      await delay(100)

      await outboundStream.closeRead()

      expect(sendCloseReadSpy.called).to.be.false()
    })

    it('does not send close write when remote closes read', async () => {
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseWriteSpy = Sinon.spy(outboundStream, 'sendCloseWrite')

      await inboundStream.closeRead()
      await raceEvent(outboundStream, 'remoteClosedRead')

      await delay(100)

      await outboundStream.closeWrite()

      expect(sendCloseWriteSpy.called).to.be.false()
    })

    it('does not send close read or write when remote resets', async () => {
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseReadSpy = Sinon.spy(outboundStream, 'sendCloseRead')
      // @ts-expect-error internal method of AbstractMessageStream
      const sendCloseWriteSpy = Sinon.spy(outboundStream, 'sendCloseWrite')

      inboundStream.abort(new Error('Urk!'))

      await raceEvent(outboundStream, 'close')

      await delay(100)

      await outboundStream.close()

      await delay(100)

      expect(sendCloseReadSpy.called).to.be.false()
      expect(sendCloseWriteSpy.called).to.be.false()
    })

    it('should wait for sending data to finish when closing gracefully', async () => {
      let sent = 0
      let received = 0

      inboundStream.addEventListener('message', (evt) => {
        received += evt.data.byteLength
      })

      // fill the send buffer
      while (true) {
        const length = 1024
        sent += length
        const sendMore = outboundStream.send(new Uint8Array(length))

        if (sendMore === false) {
          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('paused')

      // close gracefully
      await outboundStream.close()
      await raceEvent(inboundStream, 'close')

      expect(sent).to.equal(received, 'did not receive all data')
    })

    it('should wait for sending data to finish when closing the writable end gracefully', async () => {
      let sent = 0
      let received = 0

      inboundStream.addEventListener('message', (evt) => {
        received += evt.data.byteLength
      })

      // fill the send buffer
      while (true) {
        const length = 1024
        sent += length
        const sendMore = outboundStream.send(new Uint8Array(length))

        if (sendMore === false) {
          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('paused')

      // close gracefully
      await outboundStream.closeWrite()
      await raceEvent(inboundStream, 'remoteClosedWrite')

      expect(sent).to.equal(received, 'did not receive all data')
    })

    it('should abort close due to timeout with slow sender', async () => {
      streams = await createStreamPair({
        delay: 100
      })

      outboundStream = streams[0]
      inboundStream = streams[1]

      // fill the send buffer
      while (true) {
        const length = 1024
        const sendMore = outboundStream.send(new Uint8Array(length))

        if (sendMore === false) {
          break
        }
      }

      expect(outboundStream.writeStatus).to.equal('paused')

      // close stream, should be aborted
      await expect(outboundStream.close({
        signal: AbortSignal.timeout(10)
      })).to.eventually.be.rejected
        .with.property('name', 'AbortError')
    })
  })
}
