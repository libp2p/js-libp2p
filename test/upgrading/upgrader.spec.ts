/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { mplex } from '@libp2p/mplex'
import { multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { preSharedKey } from '../../src/pnet/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import swarmKey from '../fixtures/swarm.key.js'
import { DefaultUpgrader } from '../../src/upgrader.js'
import { codes } from '../../src/errors.js'
import { mockConnectionGater, mockConnectionManager, mockMultiaddrConnPair, mockRegistrar, mockStream, mockMuxer } from '@libp2p/interface-mocks'
import Peers from '../fixtures/peers.js'
import type { Upgrader } from '@libp2p/interface-transport'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { plaintext } from '../../src/insecure/index.js'
import type { ConnectionEncrypter, SecuredConnection } from '@libp2p/interface-connection-encrypter'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import type { Connection, ConnectionProtector, Stream } from '@libp2p/interface-connection'
import pDefer from 'p-defer'
import { pEvent } from 'p-event'
import { TimeoutController } from 'timeout-abort-controller'
import delay from 'delay'
import drain from 'it-drain'
import { Uint8ArrayList } from 'uint8arraylist'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { Components, defaultComponents } from '../../src/components.js'
import { StubbedInstance, stubInterface } from 'sinon-ts'
import { yamux } from '@chainsafe/libp2p-yamux'
import { EventEmitter } from '@libp2p/interfaces/events'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'

const addrs = [
  multiaddr('/ip4/127.0.0.1/tcp/0'),
  multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Upgrader', () => {
  let localUpgrader: Upgrader
  let localMuxerFactory: StreamMuxerFactory
  let localYamuxerFactory: StreamMuxerFactory
  let localConnectionEncrypter: ConnectionEncrypter
  let localConnectionProtector: StubbedInstance<ConnectionProtector>
  let remoteUpgrader: Upgrader
  let remoteMuxerFactory: StreamMuxerFactory
  let remotreYamuxerFactory: StreamMuxerFactory
  let remoteConnectionEncrypter: ConnectionEncrypter
  let remoteConnectionProtector: StubbedInstance<ConnectionProtector>
  let localPeer: PeerId
  let remotePeer: PeerId
  let localComponents: Components
  let remoteComponents: Components

  beforeEach(async () => {
    ([
      localPeer,
      remotePeer
    ] = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1])
    ]))

    localConnectionProtector = stubInterface<ConnectionProtector>()
    localConnectionProtector.protect.resolvesArg(0)

    localComponents = defaultComponents({
      peerId: localPeer,
      connectionGater: mockConnectionGater(),
      registrar: mockRegistrar(),
      datastore: new MemoryDatastore(),
      connectionProtector: localConnectionProtector,
      events: new EventEmitter()
    })
    localComponents.peerStore = new PersistentPeerStore(localComponents)
    localComponents.connectionManager = mockConnectionManager(localComponents)
    localMuxerFactory = mplex()()
    localYamuxerFactory = yamux()()
    localConnectionEncrypter = plaintext()()
    localUpgrader = new DefaultUpgrader(localComponents, {
      connectionEncryption: [
        localConnectionEncrypter
      ],
      muxers: [
        localMuxerFactory,
        localYamuxerFactory
      ],
      inboundUpgradeTimeout: 1000
    })

    remoteConnectionProtector = stubInterface<ConnectionProtector>()
    remoteConnectionProtector.protect.resolvesArg(0)

    remoteComponents = defaultComponents({
      peerId: remotePeer,
      connectionGater: mockConnectionGater(),
      registrar: mockRegistrar(),
      datastore: new MemoryDatastore(),
      connectionProtector: remoteConnectionProtector,
      events: new EventEmitter()
    })
    remoteComponents.peerStore = new PersistentPeerStore(remoteComponents)
    remoteComponents.connectionManager = mockConnectionManager(remoteComponents)
    remoteMuxerFactory = mplex()()
    remotreYamuxerFactory = yamux()()
    remoteConnectionEncrypter = plaintext()()
    remoteUpgrader = new DefaultUpgrader(remoteComponents, {
      connectionEncryption: [
        remoteConnectionEncrypter
      ],
      muxers: [
        remoteMuxerFactory,
        remotreYamuxerFactory
      ],
      inboundUpgradeTimeout: 1000
    })

    await localComponents.registrar.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    }, {
      maxInboundStreams: 10,
      maxOutboundStreams: 10
    })
    await remoteComponents.registrar.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    }, {
      maxInboundStreams: 10,
      maxOutboundStreams: 10
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should upgrade with valid muxers and crypto', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const stream = await connections[0].newStream('/echo/1.0.0')
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')

    const hello = uint8ArrayFromString('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      async (source) => await all(source)
    )

    expect(result).to.eql([hello])
  })

  it('should upgrade with only crypto', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    // No available muxers
    localUpgrader = new DefaultUpgrader(localComponents, {
      connectionEncryption: [
        plaintext()()
      ],
      muxers: [],
      inboundUpgradeTimeout: 1000
    })
    remoteUpgrader = new DefaultUpgrader(remoteComponents, {
      connectionEncryption: [
        plaintext()()
      ],
      muxers: [],
      inboundUpgradeTimeout: 1000
    })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    await expect(connections[0].newStream('/echo/1.0.0')).to.be.rejected()

    // Verify the MultiaddrConnection close method is called
    const inboundCloseSpy = sinon.spy(inbound, 'close')
    const outboundCloseSpy = sinon.spy(outbound, 'close')
    await Promise.all(connections.map(async conn => { await conn.close() }))
    expect(inboundCloseSpy.callCount).to.equal(1)
    expect(outboundCloseSpy.callCount).to.equal(1)
  })

  it('should use a private connection protector when provided', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const protector = preSharedKey({
      psk: uint8ArrayFromString(swarmKey)
    })()
    const protectorProtectSpy = sinon.spy(protector, 'protect')

    localComponents.connectionProtector = protector
    remoteComponents.connectionProtector = protector

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const stream = await connections[0].newStream('/echo/1.0.0')
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')

    const hello = uint8ArrayFromString('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      async (source) => await all(source)
    )

    expect(result).to.eql([hello])
    expect(protectorProtectSpy.callCount).to.eql(2)
  })

  it('should fail if crypto fails', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    class BoomCrypto implements ConnectionEncrypter {
      static protocol = '/insecure'
      public protocol = '/insecure'
      async secureInbound (): Promise<SecuredConnection> { throw new Error('Boom') }
      async secureOutbound (): Promise<SecuredConnection> { throw new Error('Boom') }
    }

    localUpgrader = new DefaultUpgrader(localComponents, {
      connectionEncryption: [
        new BoomCrypto()
      ],
      muxers: [],
      inboundUpgradeTimeout: 1000
    })
    remoteUpgrader = new DefaultUpgrader(remoteComponents, {
      connectionEncryption: [
        new BoomCrypto()
      ],
      muxers: [],
      inboundUpgradeTimeout: 1000
    })

    // Wait for the results of each side of the connection
    const results = await Promise.allSettled([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result).to.have.property('status', 'rejected')
      expect(result).to.have.nested.property('reason.code', codes.ERR_ENCRYPTION_FAILED)
    })
  })

  it('should fail if muxers do not match', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    class OtherMuxer implements StreamMuxer {
      protocol = '/muxer-local'
      streams = []
      newStream (name?: string): Stream {
        throw new Error('Not implemented')
      }

      source = (async function * () {
        yield * []
      })()

      async sink (): Promise<void> {}
      close (): void {}
    }

    class OtherMuxerFactory implements StreamMuxerFactory {
      protocol = '/muxer-local'

      createStreamMuxer (init?: StreamMuxerInit): StreamMuxer {
        return new OtherMuxer()
      }
    }

    localUpgrader = new DefaultUpgrader(localComponents, {
      connectionEncryption: [
        plaintext()()
      ],
      muxers: [
        new OtherMuxerFactory()
      ],
      inboundUpgradeTimeout: 1000
    })
    remoteUpgrader = new DefaultUpgrader(remoteComponents, {
      connectionEncryption: [
        plaintext()()
      ],
      muxers: [
        yamux()(),
        mplex()()
      ],
      inboundUpgradeTimeout: 1000
    })

    // Wait for the results of each side of the connection
    const results = await Promise.allSettled([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result).to.have.property('status', 'rejected')
      expect(result).to.have.nested.property('reason.code', codes.ERR_MUXER_UNAVAILABLE)
    })
  })

  it('should map getStreams and close methods', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    // Create a few streams, at least 1 in each direction
    await connections[0].newStream('/echo/1.0.0')
    await connections[1].newStream('/echo/1.0.0')
    await connections[0].newStream('/echo/1.0.0')
    connections.forEach(conn => {
      expect(conn.streams).to.have.length(3)
    })

    // Verify the MultiaddrConnection close method is called
    const inboundCloseSpy = sinon.spy(inbound, 'close')
    const outboundCloseSpy = sinon.spy(outbound, 'close')
    await Promise.all(connections.map(async conn => { await conn.close() }))
    expect(inboundCloseSpy.callCount).to.equal(1)
    expect(outboundCloseSpy.callCount).to.equal(1)
  })

  it('should call connection handlers', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })
    const localConnectionEventReceived = pDefer()
    const localConnectionEndEventReceived = pDefer()
    const remoteConnectionEventReceived = pDefer()
    const remoteConnectionEndEventReceived = pDefer()

    localComponents.events.addEventListener('connection:open', () => {
      localConnectionEventReceived.resolve()
    })
    localComponents.events.addEventListener('connection:close', () => {
      localConnectionEndEventReceived.resolve()
    })
    remoteComponents.events.addEventListener('connection:open', () => {
      remoteConnectionEventReceived.resolve()
    })
    remoteComponents.events.addEventListener('connection:close', () => {
      remoteConnectionEndEventReceived.resolve()
    })

    // Verify onConnection is called with the connection
    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])
    expect(connections).to.have.length(2)

    await Promise.all([
      localConnectionEventReceived.promise,
      remoteConnectionEventReceived.promise
    ])

    // Verify onConnectionEnd is called with the connection
    await Promise.all(connections.map(async conn => { await conn.close() }))

    await Promise.all([
      localConnectionEndEventReceived.promise,
      remoteConnectionEndEventReceived.promise
    ])
  })

  it('should fail to create a stream for an unsupported protocol', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const results = await Promise.allSettled([
      connections[0].newStream('/unsupported/1.0.0'),
      connections[1].newStream('/unsupported/1.0.0')
    ])
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result).to.have.property('status', 'rejected')
      expect(result).to.have.nested.property('reason.code', codes.ERR_UNSUPPORTED_PROTOCOL)
    })
  })

  it('should abort protocol selection for slow streams', async () => {
    const createStreamMuxerSpy = sinon.spy(localMuxerFactory, 'createStreamMuxer')
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // 10 ms timeout
    const timeoutController = new TimeoutController(10)

    // should have created muxer for connection
    expect(createStreamMuxerSpy).to.have.property('callCount', 1)

    // create mock muxed stream that never sends data
    const muxer = createStreamMuxerSpy.getCall(0).returnValue
    muxer.newStream = () => {
      return mockStream({
        source: (async function * () {
          // longer than the timeout
          await delay(1000)
          yield new Uint8ArrayList()
        }()),
        sink: drain
      })
    }

    await expect(connections[0].newStream('/echo/1.0.0', {
      signal: timeoutController.signal
    }))
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')
  })

  it('should close streams when protocol negotiation fails', async () => {
    await remoteComponents.registrar.unhandle('/echo/1.0.0')

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections[0].streams).to.have.lengthOf(0)
    expect(connections[1].streams).to.have.lengthOf(0)

    await expect(connections[0].newStream('/echo/1.0.0'))
      .to.eventually.be.rejected.with.property('code', 'ERR_UNSUPPORTED_PROTOCOL')

    // wait for remote to close
    await delay(100)

    expect(connections[0].streams).to.have.lengthOf(0)
    expect(connections[1].streams).to.have.lengthOf(0)
  })

  it('should allow skipping encryption, protection and muxing', async () => {
    const localStreamMuxerFactorySpy = sinon.spy(localMuxerFactory, 'createStreamMuxer')
    const localMuxerFactoryOverride = mockMuxer()
    const localStreamMuxerFactoryOverrideSpy = sinon.spy(localMuxerFactoryOverride, 'createStreamMuxer')
    const localConnectionEncrypterSpy = sinon.spy(localConnectionEncrypter, 'secureOutbound')

    const remoteStreamMuxerFactorySpy = sinon.spy(remoteMuxerFactory, 'createStreamMuxer')
    const remoteMuxerFactoryOverride = mockMuxer()
    const remoteStreamMuxerFactoryOverrideSpy = sinon.spy(remoteMuxerFactoryOverride, 'createStreamMuxer')
    const remoteConnectionEncrypterSpy = sinon.spy(remoteConnectionEncrypter, 'secureInbound')

    const { inbound, outbound } = mockMultiaddrConnPair({
      addrs: [
        multiaddr('/ip4/127.0.0.1/tcp/0').encapsulate(`/p2p/${remotePeer.toString()}`),
        multiaddr('/ip4/127.0.0.1/tcp/0')
      ],
      remotePeer
    })

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound, {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory: localMuxerFactoryOverride
      }),
      remoteUpgrader.upgradeInbound(inbound, {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory: remoteMuxerFactoryOverride
      })
    ])

    expect(connections).to.have.length(2)

    const stream = await connections[0].newStream('/echo/1.0.0')
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')

    const hello = uint8ArrayFromString('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      async (source) => await all(source)
    )

    expect(result).to.eql([hello])

    expect(localStreamMuxerFactorySpy.callCount).to.equal(0, 'did not use passed stream muxer factory')
    expect(localStreamMuxerFactoryOverrideSpy.callCount).to.equal(1, 'did not use passed stream muxer factory')

    expect(remoteStreamMuxerFactorySpy.callCount).to.equal(0, 'did not use passed stream muxer factory')
    expect(remoteStreamMuxerFactoryOverrideSpy.callCount).to.equal(1, 'did not use passed stream muxer factory')

    expect(localConnectionEncrypterSpy.callCount).to.equal(0, 'used local connection encrypter')
    expect(remoteConnectionEncrypterSpy.callCount).to.equal(0, 'used remote connection encrypter')

    expect(localConnectionProtector.protect.callCount).to.equal(0, 'used local connection protector')
    expect(remoteConnectionProtector.protect.callCount).to.equal(0, 'used remote connection protector')
  })
})

describe('libp2p.upgrader', () => {
  let peers: PeerId[]
  let libp2p: Libp2p
  let remoteLibp2p: Libp2p

  before(async () => {
    peers = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1])
    ])
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should create an Upgrader', async () => {
    const deferred = pDefer<Components>()

    libp2p = await createLibp2p({
      peerId: peers[0],
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ],
      connectionProtector: preSharedKey({
        psk: uint8ArrayFromString(swarmKey)
      }),
      services: {
        test: (components: any) => {
          deferred.resolve(components)
        }
      }
    })

    const components = await deferred.promise

    expect(components.upgrader).to.exist()
    expect(components.connectionProtector).to.exist()
  })

  it('should return muxed streams', async () => {
    const localDeferred = pDefer<Components>()
    const remoteDeferred = pDefer<Components>()

    const remotePeer = peers[1]
    libp2p = await createLibp2p({
      peerId: peers[0],
      transports: [
        webSockets()
      ],
      streamMuxers: [
        mplex(),
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          localDeferred.resolve(components)
        }
      }
    })
    const echoHandler = (): void => {}
    await libp2p.handle(['/echo/1.0.0'], echoHandler)

    remoteLibp2p = await createLibp2p({
      peerId: remotePeer,
      transports: [
        webSockets()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          remoteDeferred.resolve(components)
        }
      }
    })
    await remoteLibp2p.handle('/echo/1.0.0', echoHandler)

    const localComponents = await localDeferred.promise
    const remoteComponents = await remoteDeferred.promise

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })
    const [localConnection] = await Promise.all([
      localComponents.upgrader.upgradeOutbound(outbound),
      remoteComponents.upgrader.upgradeInbound(inbound)
    ])
    const remoteLibp2pUpgraderOnStreamSpy = sinon.spy(remoteComponents.upgrader as DefaultUpgrader, '_onStream')

    const stream = await localConnection.newStream(['/echo/1.0.0'])
    expect(stream).to.include.keys(['id', 'close', 'reset', 'stat'])

    const [arg0] = remoteLibp2pUpgraderOnStreamSpy.getCall(0).args
    expect(arg0.stream).to.include.keys(['id', 'close', 'reset', 'stat'])
  })

  it('should emit connect and disconnect events', async () => {
    const remotePeer = peers[1]
    libp2p = await createLibp2p({
      peerId: peers[0],
      addresses: {
        listen: [
          `${MULTIADDRS_WEBSOCKETS}/p2p-circuit`
        ]
      },
      transports: [
        webSockets({
          filter: filters.all
        }),
        circuitRelayTransport()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })
    await libp2p.start()

    remoteLibp2p = await createLibp2p({
      peerId: remotePeer,
      transports: [
        webSockets({
          filter: filters.all
        }),
        circuitRelayTransport()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })
    await remoteLibp2p.start()

    // Upgrade and check the connect event
    const connectionPromise = pEvent<'connection:open', CustomEvent<Connection>>(libp2p, 'connection:open')

    const connection = await remoteLibp2p.dial(libp2p.getMultiaddrs())

    const connectEvent = await connectionPromise

    if (connectEvent.type !== 'connection:open') {
      throw new Error(`Incorrect event type, expected: 'connection:open' actual: ${connectEvent.type}`)
    }

    expect(remotePeer.equals(connectEvent.detail.remotePeer)).to.equal(true)

    const disconnectionPromise = pEvent<'peer:disconnect', CustomEvent<PeerId>>(libp2p, 'peer:disconnect')

    // Close and check the disconnect event
    await connection.close()

    const disconnectEvent = await disconnectionPromise

    if (disconnectEvent.type !== 'peer:disconnect') {
      throw new Error(`Incorrect event type, expected: 'peer:disconnect' actual: ${disconnectEvent.type}`)
    }

    expect(remotePeer.equals(disconnectEvent.detail)).to.equal(true)
  })

  it('should limit the number of incoming streams that can be opened using a protocol', async () => {
    const localDeferred = pDefer<Components>()
    const remoteDeferred = pDefer<Components>()
    const protocol = '/a-test-protocol/1.0.0'
    const remotePeer = peers[1]
    libp2p = await createLibp2p({
      peerId: peers[0],
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          localDeferred.resolve(components)
        }
      }
    })

    remoteLibp2p = await createLibp2p({
      peerId: remotePeer,
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          remoteDeferred.resolve(components)
        }
      }
    })

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const localComponents = await localDeferred.promise
    const remoteComponents = await remoteDeferred.promise

    const [localToRemote] = await Promise.all([
      localComponents.upgrader.upgradeOutbound(outbound),
      remoteComponents.upgrader.upgradeInbound(inbound)
    ])

    let streamCount = 0

    await libp2p.handle(protocol, (data) => {}, {
      maxInboundStreams: 10,
      maxOutboundStreams: 10
    })

    await remoteLibp2p.handle(protocol, (data) => {
      streamCount++
    }, {
      maxInboundStreams: 1,
      maxOutboundStreams: 1
    })

    expect(streamCount).to.equal(0)

    await localToRemote.newStream(protocol)

    expect(streamCount).to.equal(1)

    await expect(localToRemote.newStream(protocol)).to.eventually.be.rejected()
      .with.property('code', 'ERR_STREAM_RESET')
  })

  it('should limit the number of outgoing streams that can be opened using a protocol', async () => {
    const localDeferred = pDefer<Components>()
    const remoteDeferred = pDefer<Components>()
    const protocol = '/a-test-protocol/1.0.0'
    const remotePeer = peers[1]
    libp2p = await createLibp2p({
      peerId: peers[0],
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          localDeferred.resolve(components)
        }
      }
    })

    remoteLibp2p = await createLibp2p({
      peerId: remotePeer,
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          remoteDeferred.resolve(components)
        }
      }
    })

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const localComponents = await localDeferred.promise
    const remoteComponents = await remoteDeferred.promise

    const [localToRemote] = await Promise.all([
      localComponents.upgrader.upgradeOutbound(outbound),
      remoteComponents.upgrader.upgradeInbound(inbound)
    ])

    let streamCount = 0

    await libp2p.handle(protocol, (data) => {}, {
      maxInboundStreams: 1,
      maxOutboundStreams: 1
    })

    await remoteLibp2p.handle(protocol, (data) => {
      streamCount++
    }, {
      maxInboundStreams: 10,
      maxOutboundStreams: 10
    })

    expect(streamCount).to.equal(0)

    await localToRemote.newStream(protocol)

    expect(streamCount).to.equal(1)

    await expect(localToRemote.newStream(protocol)).to.eventually.be.rejected()
      .with.property('code', codes.ERR_TOO_MANY_OUTBOUND_PROTOCOL_STREAMS)
  })
})
