/* eslint-env mocha */

import { ConnectionClosedError, UnsupportedProtocolError, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { pair } from 'it-pair'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { ConnectionMonitor } from '../../src/connection-monitor.js'
import type { ComponentLogger, Stream, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

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
    const stream = stubInterface<Stream>({
      ...pair<any>()
    })
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
    const stream = stubInterface<Stream>({
      ...pair<any>()
    })
    connection.newStream.withArgs('/foobar/ping/1.0.0').resolves(stream)

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.rtt).to.be.gte(0)
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
        initialValue: 10
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
