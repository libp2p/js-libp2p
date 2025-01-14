import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger, logger, peerLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { createConnection } from '../../src/connection/index.js'
import { pair } from './fixtures/pair.js'
import type { Connection, Stream } from '@libp2p/interface'

function defaultConnectionInit (): any {
  return {
    timeline: {
      open: Date.now() - 10,
      upgraded: Date.now()
    },
    direction: 'outbound',
    encryption: '/secio/1.0.0',
    multiplexer: '/mplex/6.7.0',
    status: 'open',
    newStream: Sinon.stub(),
    close: Sinon.stub(),
    abort: Sinon.stub(),
    getStreams: Sinon.stub(),
    logger: defaultLogger()
  }
}

describe('connection', () => {
  it('should not require local or remote addrs', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    return createConnection({
      remotePeer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
      ...defaultConnectionInit()
    })
  })

  it('should append remote peer id to address if not already present', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const conn = createConnection({
      remotePeer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
      ...defaultConnectionInit()
    })

    expect(conn.remoteAddr.getPeerId()).to.equal(remotePeer.toString())
  })

  it('should not append remote peer id to address if present', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const conn = createConnection({
      remotePeer,
      remoteAddr: multiaddr(`/ip4/127.0.0.1/tcp/4002/p2p/${otherPeer}`),
      ...defaultConnectionInit()
    })

    expect(conn.remoteAddr.getPeerId()).to.equal(otherPeer.toString())
  })
})

describe('compliance', () => {
  let connection: Connection
  let timelineProxy
  const proxyHandler = {
    set () {
      // @ts-expect-error - TS fails to infer here
      return Reflect.set(...arguments)
    }
  }

  beforeEach(async () => {
    const localPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr('/ip4/127.0.0.1/tcp/8081')
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    let openStreams: Stream[] = []
    let streamId = 0

    connection = createConnection({
      remotePeer,
      remoteAddr,
      timeline: {
        open: Date.now() - 10,
        upgraded: Date.now()
      },
      direction: 'outbound',
      encryption: '/secio/1.0.0',
      multiplexer: '/mplex/6.7.0',
      status: 'open',
      logger: peerLogger(localPeer),
      newStream: async (protocols) => {
        const id = `${streamId++}`
        const stream: Stream = {
          ...pair(),
          close: async () => {
            void stream.sink(async function * () {}())
            openStreams = openStreams.filter(s => s.id !== id)
          },
          closeRead: async () => {},
          closeWrite: async () => {
            void stream.sink(async function * () {}())
          },
          id,
          abort: () => {},
          direction: 'outbound',
          protocol: protocols[0],
          timeline: {
            open: 0
          },
          metadata: {},
          status: 'open',
          writeStatus: 'ready',
          readStatus: 'ready',
          log: logger('test')
        }

        openStreams.push(stream)

        return stream
      },
      close: async () => {},
      abort: () => {},
      getStreams: () => openStreams
    })

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
    const protocol = '/echo/0.0.1'
    await connection.newStream([protocol])

    // Close connection
    expect(connection.timeline.close).to.not.exist()
    await connection.close()

    expect(connection.timeline.close).to.exist()
    expect(connection.status).to.equal('closed')
  })

  it('should properly track streams', async () => {
    // Open stream
    const protocol = '/echo/0.0.1'
    const stream = await connection.newStream([protocol])
    expect(stream).to.have.property('protocol', protocol)

    // Close stream
    await stream.close()

    expect(connection.streams.filter(s => s.id === stream.id)).to.be.empty()
  })

  it('should track outbound streams', async () => {
    // Open stream
    const protocol = '/echo/0.0.1'
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
      const protocol = '/echo/0.0.1'
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
