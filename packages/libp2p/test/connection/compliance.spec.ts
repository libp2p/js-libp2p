import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { createConnection } from '../../src/connection.js'
import { defaultConnectionComponents, defaultConnectionInit, ECHO_PROTOCOL } from './utils.ts'
import type { ConnectionComponents, ConnectionInit } from '../../src/connection.js'
import type { Connection } from '@libp2p/interface'

describe('connection - compliance', () => {
  let components: ConnectionComponents
  let init: ConnectionInit
  let connection: Connection
  let timelineProxy
  const proxyHandler = {
    set () {
      // @ts-expect-error - TS fails to infer here
      return Reflect.set(...arguments)
    }
  }

  beforeEach(async () => {
    components = defaultConnectionComponents()
    init = await defaultConnectionInit()

    connection = createConnection(components, init)

    timelineProxy = new Proxy({
      open: Date.now() - 10,
      upgraded: Date.now()
    }, proxyHandler)

    connection.timeline = timelineProxy
  })

  it('should have properties set', () => {
    expect(connection.id).to.exist()
    expect(connection.remotePeer).to.exist()
    expect(connection.remoteAddr).to.exist()
    expect(connection.status).to.equal('open')
    expect(connection.timeline.open).to.exist()
    expect(connection.timeline.close).to.not.exist()
    expect(connection.direction).to.exist()
    expect(connection.streams).to.eql([])
    expect(connection.tags).to.eql([])
  })

  it('should get the metadata of an open connection', () => {
    expect(connection.status).to.equal('open')
    expect(connection.direction).to.exist()
    expect(connection.timeline.open).to.exist()
    expect(connection.timeline.close).to.not.exist()
  })

  it('should return an empty array of streams', () => {
    const streams = connection.streams

    expect(streams).to.eql([])
  })

  it('should be able to create a new stream', async () => {
    expect(connection.streams).to.be.empty()

    const protocolToUse = '/echo/0.0.1'
    const stream = await connection.newStream([protocolToUse])

    expect(stream).to.have.property('protocol', protocolToUse)

    const connStreams = connection.streams

    expect(stream).to.exist()
    expect(connStreams).to.exist()
    expect(connStreams).to.have.lengthOf(1)
    expect(connStreams[0]).to.equal(stream)
  })

  it('should be able to close the connection after being created', async () => {
    expect(connection.timeline.close).to.not.exist()
    await connection.close()

    expect(connection.timeline.close).to.exist()
    expect(connection.status).to.equal('closed')
  })

  it('should be able to close the connection after opening a stream', async () => {
    // Open stream
    const protocol = ECHO_PROTOCOL
    await connection.newStream([protocol])

    // Close connection
    expect(connection.timeline.close).to.not.exist()
    await connection.close()

    expect(connection.timeline.close).to.exist()
    expect(connection.status).to.equal('closed')
  })

  it('should properly track streams', async () => {
    // Open stream
    const protocol = ECHO_PROTOCOL
    const stream = await connection.newStream([protocol])
    expect(stream).to.have.property('protocol', protocol)

    // Close stream
    await stream.close()

    expect(connection.streams.filter(s => s.id === stream.id)).to.be.empty()
  })

  it('should track outbound streams', async () => {
    // Open stream
    const protocol = ECHO_PROTOCOL
    const stream = await connection.newStream(protocol)
    expect(stream).to.have.property('direction', 'outbound')
  })

  it('should support a proxy on the timeline', async () => {
    Sinon.spy(proxyHandler, 'set')
    expect(connection.timeline.close).to.not.exist()

    await connection.close()
    // @ts-expect-error - fails to infer callCount
    expect(proxyHandler.set.callCount).to.equal(1)
    // @ts-expect-error - fails to infer getCall
    const [obj, key, value] = proxyHandler.set.getCall(0).args
    expect(obj).to.eql(connection.timeline)
    expect(key).to.equal('close')
    expect(value).to.be.a('number').that.equals(connection.timeline.close)
  })

  it('should fail to create a new stream if the connection is closing', async () => {
    expect(connection.timeline.close).to.not.exist()
    const p = connection.close()

    try {
      const protocol = ECHO_PROTOCOL
      await connection.newStream([protocol])
    } catch (err: any) {
      expect(err).to.exist()
      return
    } finally {
      await p
    }

    throw new Error('should fail to create a new stream if the connection is closing')
  })

  it('should fail to create a new stream if the connection is closed', async () => {
    expect(connection.timeline.close).to.not.exist()
    await connection.close()

    await expect(connection.newStream(['/echo/0.0.1'])).to.eventually.be.rejected
      .with.property('name', 'ConnectionClosedError')
  })
})
