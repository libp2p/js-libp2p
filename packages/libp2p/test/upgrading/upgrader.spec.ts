/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { logger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import drain from 'it-drain'
import { encode } from 'it-length-prefixed'
import map from 'it-map'
import { pEvent } from 'p-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Upgrader } from '../../src/upgrader.js'
import { createDefaultUpgraderComponents } from './utils.js'
import type { UpgraderComponents, UpgraderInit } from '../../src/upgrader.js'
import type { ConnectionEncrypter, StreamMuxerFactory, MultiaddrConnection, StreamMuxer, ConnectionProtector, PeerId, SecuredConnection, Stream, StreamMuxerInit, Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

describe('upgrader', () => {
  let components: UpgraderComponents
  let init: UpgraderInit
  const encrypterProtocol = '/test-encrypter'
  const muxerProtocol = '/test-muxer'
  let remotePeer: PeerId
  let remoteAddr: Multiaddr
  let maConn: MultiaddrConnection

  class BoomCrypto implements ConnectionEncrypter {
    static protocol = encrypterProtocol
    public protocol = encrypterProtocol
    async secureInbound (): Promise<SecuredConnection> { throw new Error('Boom') }
    async secureOutbound (): Promise<SecuredConnection> { throw new Error('Boom') }
  }

  beforeEach(async () => {
    remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)
    components = await createDefaultUpgraderComponents()

    init = {
      connectionEncrypters: [
        stubInterface<ConnectionEncrypter>({
          protocol: encrypterProtocol,
          secureOutbound: async (connection) => ({
            conn: connection,
            remotePeer
          }),
          secureInbound: async (connection) => ({
            conn: connection,
            remotePeer
          })
        })
      ],
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            protocol: muxerProtocol,
            sink: async (source) => drain(source),
            source: (async function * () {})()
          })
        })
      ]
    }

    maConn = stubInterface<MultiaddrConnection>({
      remoteAddr,
      log: logger('test'),
      sink: async (source) => drain(source),
      source: map((async function * () {
        yield '/multistream/1.0.0\n'
        yield `${encrypterProtocol}\n`
        yield `${muxerProtocol}\n`
      })(), str => encode.single(uint8ArrayFromString(str)))
    })
  })

  it('should upgrade outbound with valid muxers and crypto', async () => {
    const upgrader = new Upgrader(components, init)
    const conn = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })
    expect(conn.encryption).to.equal(encrypterProtocol)
    expect(conn.multiplexer).to.equal(muxerProtocol)
  })

  it('should upgrade outbound with only crypto', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: []
    })

    const connection = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(connection.newStream('/echo/1.0.0')).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')
  })

  it('should use a private connection protector when provided for inbound connections', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    connectionProtector.protect.callsFake(async (conn) => conn)

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, init)

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    expect(connectionProtector.protect.callCount).to.equal(1)
  })

  it('should use a private connection protector when provided for outbound connections', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    connectionProtector.protect.callsFake(async (conn) => conn)

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, init)

    await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    expect(connectionProtector.protect.callCount).to.equal(1)
  })

  it('should fail inbound if crypto fails', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      connectionEncrypters: [
        new BoomCrypto()
      ]
    })

    await expect(upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should fail outbound if crypto fails', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      connectionEncrypters: [
        new BoomCrypto()
      ]
    })

    await expect(upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should abort if inbound upgrade is slow', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })

    maConn.source = map(maConn.source, async (buf) => {
      await delay(2000)
      return buf
    })

    await expect(upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('message').that.include('aborted')
  })

  it('should abort by signal if inbound upgrade is slow', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })

    maConn.source = map(maConn.source, async (buf) => {
      await delay(2000)
      return buf
    })

    await expect(upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(100)
    })).to.eventually.be.rejected
      .with.property('message').that.include('aborted')
  })

  it('should not abort if inbound upgrade is successful', async () => {
    const components = await createDefaultUpgraderComponents()
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    const event = await connectionPromise

    await delay(1000)

    // connections should still be open after timeout
    expect(event.detail.status).to.equal('open')
  })

  it('should not abort if outbound upgrade is successful', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 100
    })
    const conn = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    await delay(1000)

    // connections should still be open after timeout
    expect(conn.status).to.equal('open')
  })

  it('should not abort by signal if inbound upgrade is successful', async () => {
    const components = await createDefaultUpgraderComponents()
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(100)
    })

    const event = await connectionPromise

    await delay(1000)

    // connections should still be open after timeout
    expect(event.detail.status).to.equal('open')
  })

  it('should not abort by signal if outbound upgrade is successful', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      inboundUpgradeTimeout: 10000
    })
    const conn = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(100)
    })

    await delay(1000)

    // connections should still be open after timeout
    expect(conn.status).to.equal('open')
  })

  it('should abort protocol selection for slow outbound stream creation', async () => {
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            protocol: muxerProtocol,
            sink: async (source) => drain(source),
            source: (async function * () {})(),
            newStream: () => stubInterface<Stream>({
              id: 'stream-id',
              log: logger('test-stream'),
              sink: async (source) => drain(source),
              source: (async function * (): any {
                await delay(2000)
                yield Uint8Array.from([0, 1, 2, 3, 4])
              })()
            })
          })
        })
      ]
    })
    const conn = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(conn.newStream('/echo/1.0.0', {
      signal: AbortSignal.timeout(100)
    })).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })

  it('should abort stream when protocol negotiation fails on outbound stream', async () => {
    let stream: Stream | undefined

    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => stubInterface<StreamMuxer>({
            protocol: muxerProtocol,
            sink: async (source) => drain(source),
            source: (async function * () {
              await delay(2000)
              yield Uint8Array.from([0, 1, 2, 3, 4])
            })(),
            newStream: () => {
              stream = stubInterface<Stream>({
                id: 'stream-id',
                log: logger('test-stream'),
                sink: async (source) => drain(source),
                source: map((async function * () {
                  yield '/multistream/1.0.0\n'
                  yield '/different/protocol\n'
                })(), str => encode.single(uint8ArrayFromString(str)))
              })

              return stream
            }
          })
        })
      ]
    })
    const conn = await upgrader.upgradeOutbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    await expect(conn.newStream('/foo/1.0.0'))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')

    // wait for remote to close
    await delay(100)

    expect(stream?.abort).to.have.property('called', true)
  })

  it('should allow skipping outbound encryption and protection', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    const connectionEncrypter = stubInterface<ConnectionEncrypter>({
      protocol: encrypterProtocol
    })

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionProtector
    }), {
      ...init,
      connectionEncrypters: [
        connectionEncrypter
      ]
    })
    await upgrader.upgradeOutbound(maConn, {
      skipEncryption: true,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>({
        createStreamMuxer: () => stubInterface<StreamMuxer>({
          protocol: muxerProtocol,
          sink: async (source) => drain(source),
          source: (async function * () {})()
        })
      }),
      signal: AbortSignal.timeout(5_000)
    })
    expect(connectionProtector.protect).to.have.property('called', false)
    expect(connectionEncrypter.secureOutbound).to.have.property('called', false)
  })

  it('should allow skipping inbound encryption and protection', async () => {
    const connectionProtector = stubInterface<ConnectionProtector>()
    const connectionEncrypter = stubInterface<ConnectionEncrypter>({
      protocol: encrypterProtocol
    })

    const upgrader = new Upgrader({
      ...components,
      connectionProtector
    }, {
      ...init,
      connectionEncrypters: [
        connectionEncrypter
      ]
    })
    await upgrader.upgradeInbound(maConn, {
      skipEncryption: true,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>({
        createStreamMuxer: () => stubInterface<StreamMuxer>({
          protocol: muxerProtocol,
          sink: async (source) => drain(source),
          source: (async function * () {})()
        })
      }),
      signal: AbortSignal.timeout(5_000)
    })
    expect(connectionProtector.protect).to.have.property('called', false)
    expect(connectionEncrypter.secureOutbound).to.have.property('called', false)
  })

  it('should not decrement inbound pending connection count if the connection is denied', async () => {
    const components = await createDefaultUpgraderComponents({
      connectionManager: stubInterface<ConnectionManager>({
        acceptIncomingConnection: async () => false
      })
    })
    const upgrader = new Upgrader(components, init)
    await expect(upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected
      .with.property('name', 'ConnectionDeniedError')

    expect(components.connectionManager.afterUpgradeInbound).to.have.property('called', false)
  })

  it('should limit the number of incoming streams that can be opened using a protocol', async () => {
    const protocol = '/test/protocol'
    const maxInboundStreams = 2
    let streamMuxerInit: StreamMuxerInit | undefined
    let streamMuxer: StreamMuxer | undefined
    const components = await createDefaultUpgraderComponents({
      registrar: stubInterface<Registrar>({
        getHandler: () => ({
          options: {
            maxInboundStreams
          },
          handler: Sinon.stub()
        }),
        getProtocols: () => [protocol]
      })
    })
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: (init) => {
            streamMuxerInit = init
            streamMuxer = stubInterface<StreamMuxer>({
              protocol: muxerProtocol,
              sink: async (source) => drain(source),
              source: (async function * () {})(),
              streams: []
            })
            return streamMuxer
          }
        })
      ]
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    const event = await connectionPromise

    expect(event.detail.streams).to.have.lengthOf(0)

    for (let i = 0; i < (maxInboundStreams + 1); i++) {
      const incomingStream = stubInterface<Stream>({
        id: `stream-id-${i}`,
        log: logger('test-stream'),
        direction: 'inbound',
        sink: async (source) => drain(source),
        source: map((async function * () {
          yield '/multistream/1.0.0\n'
          yield `${protocol}\n`
        })(), str => encode.single(uint8ArrayFromString(str)))
      })

      streamMuxer?.streams.push(incomingStream)
      streamMuxerInit?.onIncomingStream?.(incomingStream)
    }

    await delay(100)

    expect(streamMuxer?.streams).to.have.lengthOf(3)
    expect(streamMuxer?.streams[0]).to.have.nested.property('abort.called', false)
    expect(streamMuxer?.streams[1]).to.have.nested.property('abort.called', false)
    expect(streamMuxer?.streams[2]).to.have.nested.property('abort.called', true)
  })

  it('should limit the number of outgoing streams that can be opened using a protocol', async () => {
    const protocol = '/test/protocol'
    const maxOutboundStreams = 2
    let streamMuxer: StreamMuxer | undefined
    const components = await createDefaultUpgraderComponents({
      registrar: stubInterface<Registrar>({
        getHandler: () => ({
          options: {
            maxOutboundStreams
          },
          handler: Sinon.stub()
        }),
        getProtocols: () => [protocol]
      })
    })
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => {
            streamMuxer = stubInterface<StreamMuxer>({
              protocol: muxerProtocol,
              sink: async (source) => drain(source),
              source: (async function * () {})(),
              streams: [],
              newStream: () => {
                const outgoingStream = stubInterface<Stream>({
                  id: 'stream-id',
                  log: logger('test-stream'),
                  direction: 'outbound',
                  sink: async (source) => drain(source),
                  source: map((async function * () {
                    yield '/multistream/1.0.0\n'
                    yield `${protocol}\n`
                  })(), str => encode.single(uint8ArrayFromString(str)))
                })

                streamMuxer?.streams.push(outgoingStream)
                return outgoingStream
              }
            })
            return streamMuxer
          }
        })
      ]
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    const event = await connectionPromise
    const conn = event.detail

    expect(conn.streams).to.have.lengthOf(0)

    await conn.newStream(protocol)
    await conn.newStream(protocol)

    await expect(conn.newStream(protocol)).to.eventually.be.rejected
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })

  it('should allow overriding the number of outgoing streams that can be opened using a protocol without a handler', async () => {
    const protocol = '/test/protocol'
    let streamMuxer: StreamMuxer | undefined
    const components = await createDefaultUpgraderComponents({
      registrar: stubInterface<Registrar>({
        getHandler: () => ({
          options: {},
          handler: Sinon.stub()
        }),
        getProtocols: () => [protocol]
      })
    })
    const upgrader = new Upgrader(components, {
      ...init,
      streamMuxers: [
        stubInterface<StreamMuxerFactory>({
          protocol: muxerProtocol,
          createStreamMuxer: () => {
            streamMuxer = stubInterface<StreamMuxer>({
              protocol: muxerProtocol,
              sink: async (source) => drain(source),
              source: (async function * () {})(),
              streams: [],
              newStream: () => {
                const outgoingStream = stubInterface<Stream>({
                  id: 'stream-id',
                  log: logger('test-stream'),
                  direction: 'outbound',
                  sink: async (source) => drain(source),
                  source: map((async function * () {
                    yield '/multistream/1.0.0\n'
                    yield `${protocol}\n`
                  })(), str => encode.single(uint8ArrayFromString(str)))
                })

                streamMuxer?.streams.push(outgoingStream)
                return outgoingStream
              }
            })
            return streamMuxer
          }
        })
      ]
    })

    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

    await upgrader.upgradeInbound(maConn, {
      signal: AbortSignal.timeout(5_000)
    })

    const event = await connectionPromise
    const conn = event.detail

    expect(conn.streams).to.have.lengthOf(0)

    const opts = {
      maxOutboundStreams: 3
    }

    await conn.newStream(protocol, opts)
    await conn.newStream(protocol, opts)
    await conn.newStream(protocol, opts)

    await expect(conn.newStream(protocol, opts)).to.eventually.be.rejected
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })

  describe('early muxer selection', () => {
    let earlyMuxerProtocol: string
    let streamMuxerFactory: StreamMuxerFactory
    let upgrader: Upgrader
    let maConn: MultiaddrConnection
    let encrypterProtocol: string

    beforeEach(async () => {
      encrypterProtocol = '/test-encrypt-with-early'
      earlyMuxerProtocol = '/early-muxer'
      streamMuxerFactory = stubInterface<StreamMuxerFactory>({
        protocol: earlyMuxerProtocol,
        createStreamMuxer: () => stubInterface<StreamMuxer>({
          protocol: earlyMuxerProtocol,
          sink: async (source) => drain(source),
          source: (async function * () {})()
        })
      })

      upgrader = new Upgrader(components, {
        connectionEncrypters: [
          stubInterface<ConnectionEncrypter>({
            protocol: encrypterProtocol,
            secureOutbound: async (connection) => ({
              conn: connection,
              remotePeer,
              streamMuxer: streamMuxerFactory
            }),
            secureInbound: async (connection) => ({
              conn: connection,
              remotePeer,
              streamMuxer: streamMuxerFactory
            })
          })
        ],
        streamMuxers: [
          stubInterface<StreamMuxerFactory>({
            protocol: '/late-muxer',
            createStreamMuxer: () => stubInterface<StreamMuxer>({
              protocol: '/late-muxer',
              sink: async (source) => drain(source),
              source: (async function * () {})()
            })
          })
        ]
      })

      maConn = stubInterface<MultiaddrConnection>({
        remoteAddr,
        log: logger('test'),
        sink: async (source) => drain(source),
        source: map((async function * () {
          yield '/multistream/1.0.0\n'
          yield `${encrypterProtocol}\n`
        })(), str => encode.single(uint8ArrayFromString(str)))
      })
    })

    it('should allow early muxer selection on inbound connection', async () => {
      const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(components.events, 'connection:open')

      await upgrader.upgradeInbound(maConn, {
        signal: AbortSignal.timeout(5_000)
      })

      const event = await connectionPromise
      const conn = event.detail

      expect(conn.multiplexer).to.equal(earlyMuxerProtocol)
    })

    it('should allow early muxer selection on outbound connection', async () => {
      const conn = await upgrader.upgradeOutbound(maConn, {
        signal: AbortSignal.timeout(5_000)
      })

      expect(conn.multiplexer).to.equal(earlyMuxerProtocol)
    })
  })
})
