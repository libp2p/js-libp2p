import { StreamCloseEvent } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { echoStream, streamPair, echo, multiaddrConnectionPair, mockMuxer } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { encode } from 'it-length-prefixed'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createConnection } from '../../src/connection.js'
import { UnhandledProtocolError } from '../../src/errors.ts'
import type { ConnectionComponents, ConnectionInit } from '../../src/connection.js'
import type { MultiaddrConnection, PeerStore, StreamMuxer } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const ECHO_PROTOCOL = '/echo/0.0.1'

describe('connection', () => {
  let components: ConnectionComponents
  let peerStore: StubbedInstance<PeerStore>
  let registrar: StubbedInstance<Registrar>
  let init: ConnectionInit
  let muxer: StreamMuxer
  let maConn: MultiaddrConnection

  beforeEach(async () => {
    const [outgoing, incoming] = multiaddrConnectionPair()

    maConn = outgoing
    peerStore = stubInterface<PeerStore>()
    registrar = stubInterface<Registrar>()

    registrar.getHandler.withArgs(ECHO_PROTOCOL).returns({
      handler (stream): void {
        echo(stream)
      },
      options: {}
    })

    components = {
      peerStore,
      registrar
    }

    const muxerFactory = mockMuxer()
    muxer = muxerFactory.createStreamMuxer(outgoing)

    // create remote muxer
    const remoteMuxer = muxerFactory.createStreamMuxer(incoming)
    remoteMuxer.addEventListener('stream', (evt) => {
      echo(evt.detail)
        .catch(err => {
          evt.detail.abort(err)
        })
    })

    init = {
      id: '',
      remotePeer: peerIdFromString('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
      maConn,
      stream: maConn,
      muxer,
      limits: undefined,
      outboundStreamProtocolNegotiationTimeout: 5_000,
      inboundStreamProtocolNegotiationTimeout: 5_000
    }
  })

  it('should not require local or remote addrs', async () => {
    const conn = createConnection(components, init)

    expect(conn).to.be.ok()
  })

  it('should append remote peer id to address if not already present', async () => {
    maConn.remoteAddr = multiaddr('/ip4/123.123.123.123/tcp/1234')

    const conn = createConnection(components, init)

    expect(conn.remoteAddr.getComponents().filter(component => component.name === 'p2p')).to.have.lengthOf(1)
  })

  it('should not append remote peer id to address if present', async () => {
    const remotePeer = peerIdFromString('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
    maConn.remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const conn = createConnection(components, {
      ...init,
      remotePeer
    })

    expect(conn.remoteAddr.getComponents().filter(component => component.name === 'p2p')).to.have.lengthOf(1)
  })

  it('should have properties set', () => {
    const connection = createConnection(components, init)

    expect(connection.id).to.exist()
    expect(connection.remotePeer).to.exist()
    expect(connection.remoteAddr).to.exist()
    expect(connection.status).to.equal('open')
    expect(connection.direction).to.exist()
    expect(connection.streams).to.eql([])
  })

  it('should get the metadata of an open connection', () => {
    const connection = createConnection(components, init)

    expect(connection.status).to.equal('open')
    expect(connection.direction).to.exist()
  })

  it('should return an empty array of streams', () => {
    const connection = createConnection(components, init)
    const streams = connection.streams

    expect(streams).to.eql([])
  })

  it('should be able to create a new stream', async () => {
    const connection = createConnection(components, init)
    expect(connection.streams).to.be.empty()

    const stream = await connection.newStream([ECHO_PROTOCOL])
    expect(stream).to.have.property('protocol', ECHO_PROTOCOL)

    expect(connection.streams).to.include(stream)
  })

  it('should be able to close the connection after being created', async () => {
    const connection = createConnection(components, init)
    expect(connection).to.have.property('status', 'open')
    await connection.close()

    expect(connection.status).to.equal('closed')
  })

  it('should be able to close the connection after opening a stream', async () => {
    muxer.createStream = () => echoStream()
    registrar.getHandler.withArgs(ECHO_PROTOCOL).returns({
      handler (stream): void {
        echo(stream)
      },
      options: {}
    })

    const connection = createConnection(components, init)
    await connection.newStream([ECHO_PROTOCOL])

    // Close connection
    expect(connection).to.have.property('status', 'open')
    await connection.close()

    expect(connection).to.have.property('status', 'closed')
  })

  it('should remove streams that close', async () => {
    const connection = createConnection(components, init)

    // Open stream
    const stream = await connection.newStream([ECHO_PROTOCOL])
    expect(connection.streams).to.include(stream)

    // Close stream
    await stream.close()
    stream.dispatchEvent(new StreamCloseEvent())

    expect(connection.streams).to.not.include(stream)
  })

  it('should remove streams that error', async () => {
    const connection = createConnection(components, init)

    // Open stream
    const stream = await connection.newStream([ECHO_PROTOCOL])
    expect(connection.streams).to.include(stream)

    // Abort stream
    stream.abort(new Error('Urk!'))

    expect(connection.streams).to.not.include(stream)
  })

  it('should fail to create a new stream if the connection is closing', async () => {
    const connection = createConnection(components, init)

    expect(connection).to.have.property('status', 'open')
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
    const connection = createConnection(components, init)

    expect(connection).to.have.property('status', 'open')
    await connection.close()

    await expect(connection.newStream(['/echo/0.0.1'])).to.eventually.be.rejected
      .with.property('name', 'ConnectionClosedError')
  })

  it('should limit the number of incoming streams that can be opened using a protocol', async () => {
    const protocol = '/test/protocol'
    const maxInboundStreams = 2

    registrar.getHandler.withArgs(protocol).returns({
      handler: Sinon.stub(),
      options: {
        maxInboundStreams
      }
    })
    registrar.getProtocols.returns([protocol])

    const connection = createConnection(components, init)
    expect(connection.streams).to.have.lengthOf(0)

    for (let i = 0; i < (maxInboundStreams + 1); i++) {
      const [outboundStream, inboundStream] = await streamPair()
      outboundStream.send(encode.single(uint8ArrayFromString('/multistream/1.0.0\n')))
      outboundStream.send(encode.single(uint8ArrayFromString(`${protocol}\n`)))

      muxer.streams.push(inboundStream)
      muxer.safeDispatchEvent('stream', {
        detail: inboundStream
      })

      await delay(50)
    }

    await delay(100)

    expect(muxer.streams).to.have.lengthOf(3)
    expect(muxer.streams[0]).to.have.property('status', 'open')
    expect(muxer.streams[1]).to.have.property('status', 'open')
    expect(muxer.streams[2]).to.have.property('status', 'aborted')
  })

  it('should limit the number of outgoing streams that can be opened using a protocol', async () => {
    const protocol = '/test/protocol'
    const maxOutboundStreams = 2

    registrar.getHandler.withArgs(protocol).returns({
      handler: Sinon.stub(),
      options: {
        maxOutboundStreams
      }
    })
    registrar.getProtocols.returns([protocol])

    const connection = createConnection(components, init)
    expect(connection.streams).to.have.lengthOf(0)

    await connection.newStream(protocol)
    await connection.newStream(protocol)

    await expect(connection.newStream(protocol)).to.eventually.be.rejected
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })

  it('should allow overriding the number of outgoing streams that can be opened using a protocol without a handler', async () => {
    const protocol = '/test/protocol'

    registrar.getHandler.withArgs(protocol).throws(new UnhandledProtocolError())

    const connection = createConnection(components, init)
    expect(connection.streams).to.have.lengthOf(0)

    const opts = {
      maxOutboundStreams: 3
    }

    await connection.newStream(protocol, opts)
    await connection.newStream(protocol, opts)
    await connection.newStream(protocol, opts)

    await expect(connection.newStream(protocol, opts)).to.eventually.be.rejected
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })
})
