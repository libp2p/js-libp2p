import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { webtransportMuxer } from '../src/muxer.js'
import type { MultiaddrConnection } from '@libp2p/interface'

/**
 * Builds a minimal WebTransport-like object suitable for unit tests.
 * The real WebTransport API is browser-only, so we construct a plain
 * object that satisfies the interface used by WebTransportStreamMuxer.
 */
function makeWt (opts: {
  createBidirectionalStream?: () => Promise<WebTransportBidirectionalStream>
  incomingBidirectionalStreams?: ReadableStream<WebTransportBidirectionalStream>
}): any {
  return {
    createBidirectionalStream: opts.createBidirectionalStream ?? Sinon.stub().rejects(new Error('not configured')),
    incomingBidirectionalStreams: opts.incomingBidirectionalStreams ?? new ReadableStream({ start () {} }),
    close: Sinon.stub(),
    closed: new Promise<void>(() => {}),
    ready: Promise.resolve()
  }
}

describe('WebTransportStreamMuxer', () => {
  it('aborts maConn when createBidirectionalStream throws', async () => {
    const sessionError = new DOMException(
      "Failed to execute 'createBidirectionalStream' on 'WebTransport': No connection.",
      'InvalidStateError'
    )

    const wt = makeWt({
      createBidirectionalStream: Sinon.stub().rejects(sessionError)
    })

    const maConn = stubInterface<MultiaddrConnection>({
      log: defaultLogger().forComponent('libp2p:webtransport:test')
    })

    const factory = webtransportMuxer(wt)
    const muxer = factory.createStreamMuxer(maConn)

    await expect(muxer.createStream()).to.eventually.be.rejectedWith(sessionError.message)

    expect(maConn.abort.calledOnce).to.be.true()
    expect(maConn.abort.firstCall.args[0]).to.equal(sessionError)
  })

  it('aborts maConn when the incoming stream reader fails', async () => {
    const sessionError = new Error('WebTransport session lost')

    // A ReadableStream that errors immediately when the reader is acquired
    const incomingBidirectionalStreams = new ReadableStream<WebTransportBidirectionalStream>({
      start (controller) {
        controller.error(sessionError)
      }
    })

    const wt = makeWt({ incomingBidirectionalStreams })

    // Use Promise.withResolvers so we can await the async abort() call
    const { promise: abortCalled, resolve: resolveAbort } = Promise.withResolvers<Error>()

    const maConn = stubInterface<MultiaddrConnection>({
      log: defaultLogger().forComponent('libp2p:webtransport:test')
    })
    maConn.abort.callsFake((err: Error) => { resolveAbort(err) })

    webtransportMuxer(wt).createStreamMuxer(maConn)

    // The reader runs in a microtask — wait for the abort to fire
    const capturedError = await abortCalled

    expect(capturedError).to.equal(sessionError)
  })
})
