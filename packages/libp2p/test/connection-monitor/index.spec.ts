import { ConnectionClosedError, UnsupportedProtocolError, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { echoStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { ConnectionMonitor } from '../../src/connection-monitor.js'
import type { ComponentLogger, Stream, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedConnectionMonitorComponents {
  logger: ComponentLogger
  connectionManager: StubbedInstance<ConnectionManager>
}

describe('connection monitor', () => {
  let monitor: ConnectionMonitor
  let components: StubbedConnectionMonitorComponents

  beforeEach(() => {
    components = {
      logger: defaultLogger(),
      connectionManager: stubInterface<ConnectionManager>()
    }
  })

  afterEach(async () => {
    await stop(monitor)
  })

  it('should monitor the liveness of a connection', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    const stream = await echoStream()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').resolves(stream)

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.rtt).to.be.gte(0)
  })

  it('should monitor the liveness of a connection with a custom ping protocol prefix', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      protocolPrefix: 'foobar'
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    const stream = await echoStream()
    connection.newStream.withArgs('/foobar/ping/1.0.0').resolves(stream)

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.rtt).to.be.gte(0)
  })

  it('should clean up timeout signal listeners after each heartbeat', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const cleanUpSpy = Sinon.spy((monitor as any).timeout, 'cleanUp')

    const connection = stubInterface<Connection>()
    const stream = await echoStream()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').resolves(stream)

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(cleanUpSpy.callCount).to.be.gte(1)
  })

  it('should monitor the liveness of a connection that does not support ping', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async () => {
      await delay(10)
      throw new UnsupportedProtocolError('Unsupported protocol')
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.rtt).to.be.gte(0)
  })

  it('should abort a connection that times out', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 50,
      pingTimeout: {
        maxTimeout: 50
      }
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async (protocols, opts) => {
      await delay(200)
      opts?.signal?.throwIfAborted()
      return stubInterface<Stream>()
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(500)

    expect(connection.abort).to.have.property('called', true)
  })

  it('should abort a connection that fails', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async (protocols, opts) => {
      throw new ConnectionClosedError('Connection closed')
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(500)

    expect(connection.abort).to.have.property('called', true)
  })

  it('should not abort a connection that fails when abortConnectionOnPingFailure is false', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      abortConnectionOnPingFailure: false
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async (protocols, opts) => {
      throw new ConnectionClosedError('Connection closed')
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(500)

    expect(connection.abort).to.have.property('called', false)
  })

  it('should abort the probe stream when the ping exchange fails', async () => {
    // Regression: if the probe opens a stream but throws during write/read,
    // stream.close() is never reached and the stream remains counted against
    // maxOutboundStreams on the muxer. The catch block must release the slot
    // by calling stream.abort() so the next probe can still open a stream.
    monitor = new ConnectionMonitor(components, {
      pingInterval: 50,
      pingTimeout: {
        maxTimeout: 50
      }
    })

    await start(monitor)

    const stream = stubInterface<Stream>()
    // Simulate the status the muxer would assign to an opened-but-not-closed
    // stream: it's still 'open' from the muxer's perspective until abort/close
    // drives it to a terminal state.
    ;(stream as any).status = 'open'
    // Make sink (called by bs.write) throw as if the timeout signal aborted.
    ;(stream.send as any).throws(new Error('simulated signal abort during write'))

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').resolves(stream)
    components.connectionManager.getConnections.returns([connection])

    await delay(200)

    expect(stream.abort).to.have.property('called', true)
  })

  it('should abort a connection that fails when abortConnectionOnPingFailure is true', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      abortConnectionOnPingFailure: true
    })

    await start(monitor)

    const connection = stubInterface<Connection>()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async (protocols, opts) => {
      throw new ConnectionClosedError('Connection closed')
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.abort).to.have.property('called', true)
  })
})
