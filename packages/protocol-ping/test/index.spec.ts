/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair, byteStream, echo } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { PING_LENGTH, PING_PROTOCOL } from '../src/constants.js'
import { Ping } from '../src/ping.js'
import type { Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedPingServiceComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
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
    const [outgoingStream, incomingStream] = await streamPair()

    void Promise.resolve()
      .then(async () => {
        for await (const buf of incomingStream) {
          incomingStream.send(buf)
        }

        incomingStream.close()
      })

    const connection = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    connection.newStream.withArgs(PING_PROTOCOL).resolves(outgoingStream)

    // Run ping
    await expect(ping.ping(remotePeer)).to.eventually.be.gte(0)
  })

  it('should time out pinging another peer when waiting for a pong', async () => {
    const timeout = 10
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const [outgoingStream, incomingStream] = await streamPair({
      delay: 1_000
    })

    void echo(incomingStream)

    const connection = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    components.connectionManager.openConnection.withArgs(remotePeer).resolves(connection)

    connection.newStream.withArgs(PING_PROTOCOL).resolves(outgoingStream)

    // 10 ms timeout
    const signal = AbortSignal.timeout(timeout)
    const outgoingStreamAbortSpy = Sinon.spy(outgoingStream, 'abort')

    // Run ping, should time out
    await expect(ping.ping(remotePeer, {
      signal
    })).to.eventually.be.rejected
      .with.property('name', 'TimeoutError')

    // should have aborted stream
    expect(outgoingStreamAbortSpy).to.have.property('called', true)
  })

  it('should handle incoming ping', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const handler = components.registrar.handle.getCall(0).args[1]

    // handle incoming ping stream
    handler(incomingStream, stubInterface<Connection>())
      ?.catch(() => {})

    const b = byteStream(outgoingStream)

    const input = new Uint8Array(PING_LENGTH).fill(1)
    outgoingStream.log('write ping 1')
    await b.write(input)
    const output = await b.read({
      bytes: PING_LENGTH
    })
    expect(output?.subarray()).to.equalBytes(input)

    // the spec allows sending more than one ping on a stream
    const input2 = new Uint8Array(PING_LENGTH).fill(2)
    outgoingStream.log('write ping 2')
    await b.write(input2)
    const output2 = await b.read({
      bytes: PING_LENGTH
    })
    expect(output2.subarray()).to.equalBytes(input2)

    await outgoingStream.close()
  })

  it('should throw if sending stalls', async () => {
    const [outgoingStream, incomingStream] = await streamPair()
    const handler = components.registrar.handle.getCall(0).args[1]
    const errorPromise = Promise.withResolvers<Error>()

    // handle incoming ping stream
    handler(incomingStream, stubInterface<Connection>())
      ?.catch((err) => {
        errorPromise.resolve(err)
      })

    const b = byteStream(outgoingStream)

    // send a ping message plus a few extra bytes
    await b.write(new Uint8Array(35))

    const pong = await b.read({
      bytes: PING_LENGTH
    })
    expect(pong).to.have.lengthOf(PING_LENGTH)

    // ping messages have to be 32 bytes - we've sent 35 and will not send the
    // remaining 29 bytes
    await delay(200)

    await expect(errorPromise.promise).to.eventually.have.property('name', 'TimeoutError')
  })
})
