import { start, stop } from '@libp2p/interface'
import { streamPair, UnexpectedEOFError } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { Echo } from '../src/echo.js'
import type { Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { AbstractStream } from '@libp2p/utils'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedFetchComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
}

async function createComponents (): Promise<StubbedFetchComponents> {
  return {
    registrar: stubInterface<Registrar>(),
    connectionManager: stubInterface<ConnectionManager>()
  }
}

describe('echo', () => {
  let components: StubbedFetchComponents
  let echo: Echo

  beforeEach(async () => {
    components = await createComponents()
    echo = new Echo(components)
  })

  afterEach(async () => {
    sinon.restore()

    await stop(echo)
  })

  it('should have a protocol', async () => {
    expect(echo.protocol).to.equal('/echo/1.0.0')
  })

  it('should echo data', async () => {
    await start(echo)

    const [outgoingStream, incomingStream] = await streamPair()

    const handler = components.registrar.handle.getCall(0).args[1]
    handler(incomingStream, stubInterface<Connection>())

    const output = all(outgoingStream)
    const input = Uint8Array.from([0, 1, 2, 3])

    outgoingStream.send(input)
    outgoingStream.close()

    expect(new Uint8ArrayList(...(await output)).subarray()).to.equalBytes(input)
  })

  it('should echo data using method', async () => {
    await start(echo)

    const [outgoingStream, incomingStream] = await streamPair()

    const handler = components.registrar.handle.getCall(0).args[1]
    handler(incomingStream, stubInterface<Connection>())

    const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')

    components.connectionManager.openStream.withArgs(ma).resolves(outgoingStream)

    const input = Uint8Array.from([0, 1, 2, 3])

    const output = await echo.echo(ma, input)

    expect(output.subarray()).to.equalBytes(input)
  })

  it('rejects with the underread error when the stream closes before the data is echoed back', async () => {
    const [outgoingStream] = await streamPair()
    const stream = outgoingStream as AbstractStream

    // stop queued bytes being flushed so the stream's writable end is still
    // closing when the transport closes - this reproduces a connection dropping
    // part-way through a transfer
    stream.sendData = () => ({ sentBytes: 0, canSendMore: false })

    const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')
    components.connectionManager.openStream.withArgs(ma).resolves(stream)

    const input = Uint8Array.from([0, 1, 2, 3])
    const echoPromise = echo.echo(ma, input)

    // wait for echo() to send the data and begin closing the stream
    while (stream.writeStatus !== 'closing') {
      await new Promise<void>(resolve => { setTimeout(resolve, 1) })
    }

    // attach the rejection handler before the transport closes
    const assertion = expect(echoPromise).to.eventually.be.rejectedWith(UnexpectedEOFError)

    // the transport closes before the data is echoed back - this must surface as
    // an underread rather than throwing the transport-close error and leaving
    // the result promise unhandled
    stream.onTransportClosed()

    await assertion
  })
})
