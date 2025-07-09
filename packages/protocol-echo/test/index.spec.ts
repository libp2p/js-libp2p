/* eslint-env mocha */

import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { Echo } from '../src/echo.js'
import type { Connection, Stream } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
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

    const duplex = duplexPair<any>()
    const outgoingStream = stubInterface<Stream>()
    outgoingStream.source = duplex[0].source
    outgoingStream.sink.callsFake(async source => duplex[0].sink(source))

    const incomingStream = stubInterface<Stream>()
    incomingStream.source = duplex[1].source
    incomingStream.sink.callsFake(async source => duplex[1].sink(source))

    const handler = components.registrar.handle.getCall(0).args[1]
    handler({
      stream: incomingStream,
      connection: stubInterface<Connection>({
        log: defaultLogger().forComponent('connection')
      })
    })

    const input = Uint8Array.from([0, 1, 2, 3])

    const output = await pipe(
      [input],
      outgoingStream,
      async (source) => {
        return new Uint8ArrayList(...(await all(source))).subarray()
      }
    )

    expect(output).to.equalBytes(input)
  })

  it('should echo data using method', async () => {
    await start(echo)

    const duplex = duplexPair<any>()
    const outgoingStream = stubInterface<Stream>()
    outgoingStream.source = duplex[0].source
    outgoingStream.sink.callsFake(async source => duplex[0].sink(source))

    const incomingStream = stubInterface<Stream>()
    incomingStream.source = duplex[1].source
    incomingStream.sink.callsFake(async source => duplex[1].sink(source))

    const handler = components.registrar.handle.getCall(0).args[1]
    handler({
      stream: incomingStream,
      connection: stubInterface<Connection>({
        log: defaultLogger().forComponent('connection')
      })
    })

    const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')

    components.connectionManager.openConnection.withArgs(ma).resolves(stubInterface<Connection>({
      newStream: async () => outgoingStream
    }))

    const input = Uint8Array.from([0, 1, 2, 3])

    const output = await echo.echo(ma, input)

    expect(output).to.equalBytes(output)
  })
})
