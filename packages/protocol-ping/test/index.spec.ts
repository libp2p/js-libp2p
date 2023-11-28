/* eslint-env mocha */

import { ERR_TIMEOUT, start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { byteStream } from 'it-byte-stream'
import { pair } from 'it-pair'
import { duplexPair } from 'it-pair/duplex'
import pDefer from 'p-defer'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { PING_PROTOCOL } from '../src/constants.js'
import { PingService } from '../src/ping.js'
import type { ComponentLogger, Stream, Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

interface StubbedPingServiceComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  logger: ComponentLogger
}

function echoStream (): StubbedInstance<Stream> {
  const stream = stubInterface<Stream>()

  // make stream input echo to stream output
  const duplex: any = pair()
  stream.source = duplex.source
  stream.sink = duplex.sink

  return stream
}

describe('ping', () => {
  let components: StubbedPingServiceComponents

  beforeEach(async () => {
    components = {
      registrar: stubInterface<Registrar>(),
      connectionManager: stubInterface<ConnectionManager>(),
      logger: defaultLogger()
    }
  })

  it('should be able to ping another peer', async () => {
    const ping = new PingService(components)

    await start(ping)

    const remotePeer = await createEd25519PeerId()

    const connection = stubInterface<Connection>()
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    const stream = echoStream()
    connection.newStream.withArgs(PING_PROTOCOL).resolves(stream)

    // Run ping
    await expect(ping.ping(remotePeer)).to.eventually.be.gte(0)
  })

  it('should time out pinging another peer when waiting for a pong', async () => {
    const timeout = 10
    const ping = new PingService(components)

    await start(ping)

    const remotePeer = await createEd25519PeerId()

    const connection = stubInterface<Connection>()
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    const stream = echoStream()
    const deferred = pDefer()
    // eslint-disable-next-line require-yield
    stream.source = (async function * () {
      await deferred.promise
    })()
    stream.abort.callsFake((err) => {
      deferred.reject(err)
    })
    connection.newStream.withArgs(PING_PROTOCOL).resolves(stream)

    // 10 ms timeout
    const signal = AbortSignal.timeout(timeout)

    // Run ping, should time out
    await expect(ping.ping(remotePeer, {
      signal
    }))
      .to.eventually.be.rejected.with.property('code', ERR_TIMEOUT)

    // should have aborted stream
    expect(stream.abort).to.have.property('called', true)
  })

  it('should handle incoming ping', async () => {
    const ping = new PingService(components)

    await start(ping)

    const remotePeer = await createEd25519PeerId()

    const connection = stubInterface<Connection>()
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    const stream = echoStream()
    connection.newStream.withArgs(PING_PROTOCOL).resolves(stream)

    const duplex = duplexPair<any>()
    const incomingStream = stubInterface<Stream>(duplex[0])
    const outgoingStream = stubInterface<Stream>(duplex[1])

    const handler = components.registrar.handle.getCall(0).args[1]

    // handle incoming ping stream
    handler({
      stream: incomingStream,
      connection: stubInterface<Connection>()
    })

    const input = Uint8Array.from([0, 1, 2, 3, 4])

    const b = byteStream(outgoingStream)
    await b.write(input)

    const output = await b.read()

    expect(output).to.equalBytes(input)
  })
})
