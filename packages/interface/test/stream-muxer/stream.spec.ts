import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import Sinon from 'sinon'
import { Uint8ArrayList } from 'uint8arraylist'
import { AbstractStream } from '../../src/stream-muxer/stream.js'
import type { AbortOptions } from '../../src/index.js'
import { logger } from '../fixtures/logger.js'

class TestStream extends AbstractStream {
  async sendNewStream (options?: AbortOptions): Promise<void> {

  }

  async sendData (buf: Uint8ArrayList, options?: AbortOptions): Promise<void> {

  }

  async sendReset (options?: AbortOptions): Promise<void> {

  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {

  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {

  }
}

describe('abstract stream', () => {
  let stream: TestStream

  beforeEach(() => {
    stream = new TestStream({
      id: 'test',
      direction: 'outbound',
      log: logger()
    })
  })

  it('sends data', async () => {
    const sendSpy = Sinon.spy(stream, 'sendData')
    const data = [
      Uint8Array.from([0, 1, 2, 3, 4])
    ]

    await stream.sink(data)

    const call = sendSpy.getCall(0)
    expect(call.args[0].subarray()).to.equalBytes(data[0])
  })

  it('receives data', async () => {
    const data = new Uint8ArrayList(
      Uint8Array.from([0, 1, 2, 3, 4])
    )

    stream.sourcePush(data)
    stream.remoteCloseWrite()

    const output = await all(stream.source)
    expect(output[0].subarray()).to.equalBytes(data.subarray())
  })

  it('closes', async () => {
    const sendCloseReadSpy = Sinon.spy(stream, 'sendCloseRead')
    const sendCloseWriteSpy = Sinon.spy(stream, 'sendCloseWrite')

    await stream.close()

    expect(sendCloseReadSpy.calledOnce).to.be.true()
    expect(sendCloseWriteSpy.calledOnce).to.be.true()

    expect(stream).to.have.property('status', 'closed')
    expect(stream).to.have.property('writeStatus', 'closed')
    expect(stream).to.have.property('readStatus', 'closed')
    expect(stream).to.have.nested.property('timeline.close').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeRead').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeWrite').that.is.a('number')
    expect(stream).to.not.have.nested.property('timeline.reset')
    expect(stream).to.not.have.nested.property('timeline.abort')
  })

  it('closes for reading', async () => {
    const sendCloseReadSpy = Sinon.spy(stream, 'sendCloseRead')
    const sendCloseWriteSpy = Sinon.spy(stream, 'sendCloseWrite')

    await stream.closeRead()

    expect(sendCloseReadSpy.calledOnce).to.be.true()
    expect(sendCloseWriteSpy.called).to.be.false()

    expect(stream).to.have.property('status', 'open')
    expect(stream).to.have.property('writeStatus', 'ready')
    expect(stream).to.have.property('readStatus', 'closed')
    expect(stream).to.not.have.nested.property('timeline.close')
    expect(stream).to.have.nested.property('timeline.closeRead').that.is.a('number')
    expect(stream).to.not.have.nested.property('timeline.closeWrite')
    expect(stream).to.not.have.nested.property('timeline.reset')
    expect(stream).to.not.have.nested.property('timeline.abort')
  })

  it('closes for writing', async () => {
    const sendCloseReadSpy = Sinon.spy(stream, 'sendCloseRead')
    const sendCloseWriteSpy = Sinon.spy(stream, 'sendCloseWrite')

    await stream.closeWrite()

    expect(sendCloseReadSpy.called).to.be.false()
    expect(sendCloseWriteSpy.calledOnce).to.be.true()

    expect(stream).to.have.property('status', 'open')
    expect(stream).to.have.property('writeStatus', 'closed')
    expect(stream).to.have.property('readStatus', 'ready')
    expect(stream).to.not.have.nested.property('timeline.close')
    expect(stream).to.not.have.nested.property('timeline.closeRead')
    expect(stream).to.have.nested.property('timeline.closeWrite').that.is.a('number')
    expect(stream).to.not.have.nested.property('timeline.reset')
    expect(stream).to.not.have.nested.property('timeline.abort')
  })

  it('aborts', async () => {
    const sendResetSpy = Sinon.spy(stream, 'sendReset')

    stream.abort(new Error('Urk!'))

    expect(sendResetSpy.calledOnce).to.be.true()

    expect(stream).to.have.property('status', 'aborted')
    expect(stream).to.have.property('writeStatus', 'closed')
    expect(stream).to.have.property('readStatus', 'closed')
    expect(stream).to.have.nested.property('timeline.close').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeRead').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeWrite').that.is.a('number')
    expect(stream).to.not.have.nested.property('timeline.reset')
    expect(stream).to.have.nested.property('timeline.abort').that.is.a('number')

    await expect(stream.sink([])).to.eventually.be.rejected
      .with.property('code', 'ERR_SINK_INVALID_STATE')
    await expect(drain(stream.source)).to.eventually.be.rejected
      .with('Urk!')
  })

  it('gets reset remotely', async () => {
    stream.reset()

    expect(stream).to.have.property('status', 'reset')
    expect(stream).to.have.property('writeStatus', 'closed')
    expect(stream).to.have.property('readStatus', 'closed')
    expect(stream).to.have.nested.property('timeline.close').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeRead').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.closeWrite').that.is.a('number')
    expect(stream).to.have.nested.property('timeline.reset').that.is.a('number')
    expect(stream).to.not.have.nested.property('timeline.abort')

    await expect(stream.sink([])).to.eventually.be.rejected
      .with.property('code', 'ERR_SINK_INVALID_STATE')
    await expect(drain(stream.source)).to.eventually.be.rejected
      .with.property('code', 'ERR_STREAM_RESET')
  })

  it('does not send close read when remote closes write', async () => {
    const sendCloseReadSpy = Sinon.spy(stream, 'sendCloseRead')

    stream.remoteCloseWrite()

    await delay(100)

    expect(sendCloseReadSpy.called).to.be.false()
  })

  it('does not send close write when remote closes read', async () => {
    const sendCloseWriteSpy = Sinon.spy(stream, 'sendCloseWrite')

    stream.remoteCloseRead()

    await delay(100)

    expect(sendCloseWriteSpy.called).to.be.false()
  })

  it('does not send close read or write when remote resets', async () => {
    const sendCloseReadSpy = Sinon.spy(stream, 'sendCloseRead')
    const sendCloseWriteSpy = Sinon.spy(stream, 'sendCloseWrite')

    stream.reset()

    await delay(100)

    expect(sendCloseReadSpy.called).to.be.false()
    expect(sendCloseWriteSpy.called).to.be.false()
  })
})
