/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { byteStream } from 'it-byte-stream'
import { pair } from 'it-pair'
import { duplexPair } from 'it-pair/duplex'
import pDefer from 'p-defer'
import { stubInterface } from 'sinon-ts'
import { PING_PROTOCOL } from '../src/constants.js'
import { Ping } from '../src/ping.js'
import type { Stream, Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedPingServiceComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
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
  let ping: Ping

  beforeEach(async () => {
    components = {
      registrar: stubInterface<Registrar>(),
      connectionManager: stubInterface<ConnectionManager>()
    }

    ping = new Ping(components, {
      timeout: 50
    })

    await start(ping)
  })

  it('should be able to ping another peer', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const connection = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    const stream = echoStream()
    connection.newStream.withArgs(PING_PROTOCOL).resolves(stream)

    // Run ping
    await expect(ping.ping(remotePeer)).to.eventually.be.gte(0)
  })

  it('should time out pinging another peer when waiting for a pong', async () => {
    const timeout = 10
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const connection = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
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
    })).to.eventually.be.rejected
      .with.property('name', 'AbortError')

    // should have aborted stream
    expect(stream.abort).to.have.property('called', true)
  })

  it('should handle incoming ping', async () => {
    const duplex = duplexPair<any>()
    const incomingStream = stubInterface<Stream>(duplex[0])
    const outgoingStream = stubInterface<Stream>(duplex[1])

    const handler = components.registrar.handle.getCall(0).args[1]

    // handle incoming ping stream
    handler({
      stream: incomingStream,
      connection: stubInterface<Connection>({
        log: defaultLogger().forComponent('connection')
      })
    })

    const b = byteStream(outgoingStream)

    const input = new Uint8Array(32).fill(1)
    void b.write(input)
    const output = await b.read()
    expect(output).to.equalBytes(input)

    const input2 = new Uint8Array(32).fill(2)
    void b.write(input2)
    const output2 = await b.read()
    expect(output2).to.equalBytes(input2)
  })

  it('should abort stream if sending stalls', async () => {
    const deferred = pDefer<Error>()

    const duplex = duplexPair<any>()
    const incomingStream = stubInterface<Stream>({
      ...duplex[0],
      abort: (err) => {
        deferred.resolve(err)
      }
    })
    const outgoingStream = stubInterface<Stream>(duplex[1])

    const handler = components.registrar.handle.getCall(0).args[1]

    // handle incoming ping stream
    handler({
      stream: incomingStream,
      connection: stubInterface<Connection>({
        log: defaultLogger().forComponent('connection')
      })
    })

    const b = byteStream(outgoingStream)

    // send a ping message plus a few extra bytes
    void b.write(new Uint8Array(35))

    const pong = await b.read()
    expect(pong).to.have.lengthOf(32)

    // never send the remaining 29 bytes (e.g. 64 - 35)
    const err = await deferred.promise
    expect(err).to.have.property('name', 'TimeoutError')
  })
})
