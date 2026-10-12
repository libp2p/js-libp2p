import { ConnectionClosedError, UnsupportedProtocolError, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { echoStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { ConnectionMonitor } from '../../src/connection-monitor.ts'
import type { ComponentLogger, Stream, Connection } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedConnectionMonitorComponents {
  logger: ComponentLogger
  connectionManager: StubbedInstance<ConnectionManager>
}

function stubConnection (props: Partial<Connection> = {}): StubbedInstance<Connection> {
  return stubInterface<Connection>({
    timeline: { open: Date.now() },
    streams: [],
    multiplexer: '/yamux/1.0.0',
    ...props
  })
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

    const connection = stubConnection()
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

    const connection = stubConnection()
    const stream = await echoStream()
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

    const connection = stubConnection()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async () => {
      await delay(10)
      throw new UnsupportedProtocolError('Unsupported protocol')
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.rtt).to.be.gte(0)
  })

  it('should abort a connection whose pings fail', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 20,
      connectionStaleTimeout: 50
    })

    await start(monitor)

    const connection = stubConnection()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').rejects(new ConnectionClosedError('Connection closed'))

    components.connectionManager.getConnections.returns([connection])

    await pWaitFor(() => connection.abort.called)

    expect(connection.abort.firstCall.args[0]).to.have.property('name', 'ConnectionStaleError')
  })

  it('should abort a connection whose pings never complete', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 20,
      connectionStaleTimeout: 50
    })

    await start(monitor)

    const connection = stubConnection()
    // ping never completes
    connection.newStream.withArgs('/ipfs/ping/1.0.0').returns(new Promise(() => {}))

    components.connectionManager.getConnections.returns([connection])

    await pWaitFor(() => connection.abort.called)

    expect(connection.abort.firstCall.args[0]).to.have.property('name', 'ConnectionStaleError')
  })

  it('should not abort a connection whose pings succeed', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 20,
      connectionStaleTimeout: 200
    })

    await start(monitor)

    const connection = stubConnection()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async () => echoStream())

    components.connectionManager.getConnections.returns([connection])

    await delay(300)

    expect(connection.newStream.callCount).to.be.gte(2)
    expect(connection.abort).to.have.property('called', false)
  })

  it('should not abort a connection that does not support ping', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 20,
      connectionStaleTimeout: 200
    })

    await start(monitor)

    const connection = stubConnection()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').rejects(new UnsupportedProtocolError('Unsupported protocol'))

    components.connectionManager.getConnections.returns([connection])

    await delay(300)

    expect(connection.newStream.callCount).to.be.gte(2)
    expect(connection.abort).to.have.property('called', false)
  })

  it('should skip connections without a stream muxer', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 20,
      connectionStaleTimeout: 50
    })

    await start(monitor)

    const connection = stubConnection({
      multiplexer: undefined
    })

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.newStream.called).to.be.false()
    expect(connection.abort.called).to.be.false()
  })

  it('should not abort a silent connection when connectionStaleTimeout is Infinity', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      connectionStaleTimeout: Infinity
    })

    await start(monitor)

    const connection = stubConnection()
    connection.timeline.open = 0
    connection.newStream.withArgs('/ipfs/ping/1.0.0').rejects(new ConnectionClosedError('Connection closed'))

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.abort).to.have.property('called', false)
  })

  it('should not start a ping while the previous ping is in flight', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10,
      pingTimeout: 10_000
    })

    await start(monitor)

    const connection = stubConnection()
    // ping never completes
    connection.newStream.withArgs('/ipfs/ping/1.0.0').returns(new Promise(() => {}))

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.newStream.callCount).to.equal(1)
  })

  it('should not start a ping while an outbound ping stream is open', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubConnection()
    connection.streams = [
      stubInterface<Stream>({ direction: 'outbound', protocol: '/ipfs/ping/1.0.0' })
    ]

    components.connectionManager.getConnections.returns([connection])

    await delay(100)

    expect(connection.newStream.called).to.be.false()
  })

  it('should ping when only inbound or other protocol streams are open', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubConnection()
    connection.streams = [
      stubInterface<Stream>({ direction: 'inbound', protocol: '/ipfs/ping/1.0.0' }),
      stubInterface<Stream>({ direction: 'outbound', protocol: '/foo/1.0.0' })
    ]
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async () => echoStream())

    components.connectionManager.getConnections.returns([connection])

    await pWaitFor(() => connection.newStream.called)
  })

  it('should count a pause in timers as at most one interval of silence', async () => {
    const clock = Sinon.useFakeTimers({
      now: 1_000_000,
      toFake: ['setInterval', 'clearInterval', 'Date']
    })

    try {
      monitor = new ConnectionMonitor(components, {
        pingInterval: 10_000,
        pingTimeout: 10_000,
        connectionStaleTimeout: 60_000
      })

      await start(monitor)

      const connection = stubConnection()
      // ping never completes
      connection.newStream.withArgs('/ipfs/ping/1.0.0').returns(new Promise(() => {}))
      components.connectionManager.getConnections.returns([connection])

      // 10s of silence
      clock.tick(10_000)

      // sleep for 90s without timers firing, counts as 10s
      clock.setSystemTime(Date.now() + 90_000)
      clock.tick(10_000)

      // 60s of silence
      clock.tick(40_000)
      expect(connection.abort.called).to.be.false()

      // 70s of silence
      clock.tick(10_000)
      expect(connection.abort.called).to.be.true()
      expect(connection.abort.firstCall.args[0]).to.have.property('name', 'ConnectionStaleError')
    } finally {
      await stop(monitor)
      clock.restore()
    }
  })

  it('should abort an in-flight ping when stopped', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    await start(monitor)

    const connection = stubConnection()
    let signal: AbortSignal | undefined
    connection.newStream.withArgs('/ipfs/ping/1.0.0').callsFake(async (protocols, opts) => {
      signal = opts?.signal
      return new Promise(() => {})
    })

    components.connectionManager.getConnections.returns([connection])

    await pWaitFor(() => signal != null)
    await stop(monitor)

    expect(signal?.aborted).to.be.true()
  })

  it('should throw if connectionStaleTimeout is not greater than pingInterval + pingTimeout', () => {
    expect(() => new ConnectionMonitor(components, {
      pingInterval: 10_000,
      pingTimeout: 10_000,
      connectionStaleTimeout: 20_000
    })).to.throw().with.property('name', 'InvalidParametersError')

    expect(() => new ConnectionMonitor(components, {
      pingInterval: 10_000,
      pingTimeout: 10_000,
      connectionStaleTimeout: 20_001
    })).to.not.throw()
  })

  it('should throw if pingInterval is too long for the default connectionStaleTimeout', () => {
    expect(() => new ConnectionMonitor(components, {
      pingInterval: 60_000
    })).to.throw().with.property('name', 'InvalidParametersError')
  })

  it('should throw if pingInterval or pingTimeout are not positive finite numbers', () => {
    expect(() => new ConnectionMonitor(components, {
      pingInterval: NaN
    })).to.throw().with.property('name', 'InvalidParametersError')

    expect(() => new ConnectionMonitor(components, {
      pingTimeout: Infinity
    })).to.throw().with.property('name', 'InvalidParametersError')
  })

  it('should abort the probe stream when the ping exchange fails', async () => {
    monitor = new ConnectionMonitor(components, {
      pingInterval: 10
    })

    const stream = stubInterface<Stream>()
    stream.send.throws(new Error('write failed'))

    const connection = stubConnection()
    connection.newStream.withArgs('/ipfs/ping/1.0.0').resolves(stream)
    components.connectionManager.getConnections.returns([connection])

    await start(monitor)

    await pWaitFor(() => stream.abort.called)

    expect(stream.abort.firstCall.args[0]).to.have.property('message', 'write failed')
  })
})
