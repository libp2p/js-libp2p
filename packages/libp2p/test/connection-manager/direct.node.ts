/* eslint-env mocha */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { yamux } from '@chainsafe/libp2p-yamux'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { isConnection, AbortError, TypedEventEmitter, start, stop } from '@libp2p/interface'
import { mockConnection, mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { mplex } from '@libp2p/mplex'
import { peerIdFromString, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { defaultComponents, type Components } from '../../src/components.js'
import { DialQueue } from '../../src/connection-manager/dial-queue.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { createLibp2p } from '../../src/index.js'
import { DefaultPeerRouting } from '../../src/peer-routing.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { ECHO_PROTOCOL, echo } from '../fixtures/echo-service.js'
import type { Connection, ConnectionProtector, Stream, Libp2p } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws/p2p/QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN')

describe('dialing (direct, TCP)', () => {
  let remoteTM: DefaultTransportManager
  let localTM: DefaultTransportManager
  let remoteAddr: Multiaddr
  let remoteComponents: Components
  let localComponents: Components
  let resolver: Sinon.SinonStub<[Multiaddr], Promise<string[]>>

  beforeEach(async () => {
    resolver = Sinon.stub<[Multiaddr], Promise<string[]>>()
    const [localPeerId, remotePeerId] = await Promise.all([
      peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    ])

    const remoteEvents = new TypedEventEmitter()
    remoteComponents = defaultComponents({
      peerId: remotePeerId,
      events: remoteEvents,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader({ events: remoteEvents }),
      connectionGater: mockConnectionGater(),
      transportManager: stubInterface<TransportManager>({
        getAddrs: Sinon.stub().returns([])
      })
    })
    remoteComponents.peerStore = new PersistentPeerStore(remoteComponents)
    remoteComponents.addressManager = new DefaultAddressManager(remoteComponents, {
      listen: [
        listenAddr.toString()
      ]
    })
    remoteTM = remoteComponents.transportManager = new DefaultTransportManager(remoteComponents)
    remoteTM.add(tcp()({
      logger: defaultLogger()
    }))
    remoteComponents.peerRouting = new DefaultPeerRouting(remoteComponents)

    const localEvents = new TypedEventEmitter()
    localComponents = defaultComponents({
      peerId: localPeerId,
      events: localEvents,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader({ events: localEvents }),
      transportManager: stubInterface<TransportManager>(),
      connectionGater: mockConnectionGater()
    })
    localComponents.peerStore = new PersistentPeerStore(localComponents)
    localComponents.connectionManager = new DefaultConnectionManager(localComponents, {
      maxInboundConnections: 100,
      maxOutboundConnections: 100,
      inboundUpgradeTimeout: 1000
    })
    localComponents.addressManager = new DefaultAddressManager(localComponents)
    localComponents.peerRouting = new DefaultPeerRouting(localComponents)
    localTM = localComponents.transportManager = new DefaultTransportManager(localComponents)
    localTM.add(tcp()({
      logger: defaultLogger()
    }))

    await start(localComponents)
    await start(remoteComponents)

    remoteAddr = remoteTM.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toString()}`)
  })

  afterEach(async () => {
    await stop(localComponents)
    await stop(remoteComponents)
  })

  afterEach(() => {
    Sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new DialQueue(localComponents)

    const connection = await dialer.dial(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to remote node with duplicated addresses', async () => {
    const remotePeer = peerIdFromString(remoteAddr.getPeerId() ?? '')
    const dnsaddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remotePeer}`)
    await localComponents.peerStore.merge(remotePeer, {
      multiaddrs: [
        dnsaddr
      ]
    })
    const dialer = new DialQueue(localComponents, {
      resolvers: {
        dnsaddr: resolver
      },
      maxParallelDials: 1
    })

    // Resolver stub
    resolver.withArgs(dnsaddr).resolves([remoteAddr.toString()])

    const connection = await dialer.dial(remotePeer)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new DialQueue(localComponents)

    await expect(dialer.dial(unsupportedAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should fail to connect if peer has no known addresses', async () => {
    const dialer = new DialQueue(localComponents)
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    await expect(dialer.dial(peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should be able to connect to a given peer id', async () => {
    await localComponents.peerStore.patch(remoteComponents.peerId, {
      multiaddrs: remoteTM.getAddrs()
    })

    const dialer = new DialQueue(localComponents)

    const connection = await dialer.dial(remoteComponents.peerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    await localComponents.peerStore.patch(remoteComponents.peerId, {
      multiaddrs: [unsupportedAddr]
    })

    const dialer = new DialQueue(localComponents)

    await expect(dialer.dial(remoteComponents.peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should only try to connect to addresses supported by the transports configured', async () => {
    const remoteAddrs = remoteTM.getAddrs()

    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    await localComponents.peerStore.patch(peerId, {
      multiaddrs: [...remoteAddrs, unsupportedAddr]
    })

    const dialer = new DialQueue(localComponents)

    Sinon.spy(localTM, 'dial')
    const connection = await dialer.dial(peerId)
    expect(localTM.dial).to.have.property('callCount', remoteAddrs.length)
    expect(connection).to.exist()

    await connection.close()
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new DialQueue(localComponents, {
      dialTimeout: 50
    })

    Sinon.stub(localTM, 'dial').callsFake(async (addr, options = {}) => {
      expect(options.signal).to.exist()
      expect(options.signal?.aborted).to.equal(false)
      expect(addr.toString()).to.eql(remoteAddr.toString())
      await delay(60)
      expect(options.signal?.aborted).to.equal(true)
      throw new AbortError()
    })

    await expect(dialer.dial(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('name', 'TimeoutError')
  })

  it('should only dial to the max concurrency', async () => {
    const peerId1 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const peerId2 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const peerId3 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const addr1 = multiaddr(`/ip4/127.0.0.1/tcp/1234/p2p/${peerId1}`)
    const addr2 = multiaddr(`/ip4/127.0.12.4/tcp/3210/p2p/${peerId2}`)
    const addr3 = multiaddr(`/ip4/123.3.11.1/tcp/2010/p2p/${peerId3}`)

    const slowDial = async (): Promise<Connection> => {
      await delay(100)
      return mockConnection(mockMultiaddrConnection(mockDuplex(), peerId1))
    }

    const actions: Record<string, (...args: any[]) => Promise<any>> = {
      [addr1.toString()]: slowDial,
      [addr2.toString()]: slowDial,
      [addr3.toString()]: async () => mockConnection(mockMultiaddrConnection(mockDuplex(), peerId3))
    }

    const dialer = new DialQueue(localComponents, {
      maxParallelDials: 2
    })

    const transportManagerDialStub = Sinon.stub(localTM, 'dial')
    transportManagerDialStub.callsFake(async ma => {
      const maStr = ma.toString()
      const action = actions[maStr]

      if (action != null) {
        return action()
      }

      throw new Error(`No action found for multiaddr ${maStr}`)
    })

    // dial 3 different peers
    void Promise.all([
      dialer.dial(addr1),
      dialer.dial(addr2),
      dialer.dial(addr3)
    ])

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(transportManagerDialStub).to.have.property('callCount', 2)

    // stop dials
    dialer.stop()
  })
})

describe('libp2p.dialer (direct, TCP)', () => {
  let libp2p: Libp2p
  let remoteLibp2p: Libp2p
  let remoteAddr: Multiaddr

  beforeEach(async () => {
    remoteLibp2p = await createLibp2p({
      addresses: {
        listen: [listenAddr.toString()]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      services: {
        echo: echo()
      }
    })

    await remoteLibp2p.start()
    remoteAddr = remoteLibp2p.getMultiaddrs()[0]
  })

  afterEach(async () => {
    Sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should use the dialer for connecting to a peer', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    await libp2p.peerStore.patch(remoteLibp2p.peerId, {
      multiaddrs: remoteLibp2p.getMultiaddrs()
    })

    const connection = await libp2p.dial(remoteLibp2p.peerId)
    expect(connection).to.exist()
    const stream = await connection.newStream(ECHO_PROTOCOL)
    expect(stream).to.exist()
    expect(stream).to.have.property('protocol', ECHO_PROTOCOL)
    await connection.close()
  })

  it('should close all streams when the connection closes', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    // register some stream handlers to simulate several protocols
    await libp2p.handle('/stream-count/1', ({ stream }) => {
      void pipe(stream, stream)
    })
    await libp2p.handle('/stream-count/2', ({ stream }) => {
      void pipe(stream, stream)
    })
    await remoteLibp2p.handle('/stream-count/3', ({ stream }) => {
      void pipe(stream, stream)
    })
    await remoteLibp2p.handle('/stream-count/4', ({ stream }) => {
      void pipe(stream, stream)
    })

    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs())

    // Create local to remote streams
    const stream = await connection.newStream([ECHO_PROTOCOL, '/other/1.0.0'])
    await connection.newStream('/stream-count/3')
    await libp2p.dialProtocol(remoteLibp2p.peerId, '/stream-count/4')

    // Partially write to the echo stream
    const source = pushable<Uint8Array>()
    void stream.sink(source)
    source.push(uint8ArrayFromString('hello'))

    // Create remote to local streams
    await remoteLibp2p.dialProtocol(libp2p.peerId, ['/stream-count/1', '/other/1.0.0'])
    await remoteLibp2p.dialProtocol(libp2p.peerId, ['/stream-count/2', '/other/1.0.0'])

    // Verify stream count
    const remoteConn = remoteLibp2p.getConnections(libp2p.peerId)

    if (remoteConn == null) {
      throw new Error('No remote connection found')
    }

    expect(connection.streams).to.have.length(5)
    expect(remoteConn).to.have.lengthOf(1)
    expect(remoteConn).to.have.nested.property('[0].streams').with.lengthOf(5)

    // Close the connection and verify all streams have been closed
    await connection.close()
    await pWaitFor(() => connection.streams.length === 0)
    await pWaitFor(() => remoteConn[0].streams.length === 0)
  })

  it('should throw when using dialProtocol with no protocols', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    // @ts-expect-error invalid params
    await expect(libp2p.dialProtocol(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('name', 'InvalidParametersError')

    await expect(libp2p.dialProtocol(remoteAddr, []))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('name', 'InvalidParametersError')
  })

  it('should be able to use hangup to close connections', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    expect(connection.timeline.close).to.not.exist()
    await libp2p.hangUp(connection.remotePeer)
    expect(connection.timeline.close).to.exist()
  })

  it('should use the protectors when provided for connecting', async () => {
    const protector: ConnectionProtector = {
      async protect (connection) {
        return connection
      }
    }

    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      connectionProtector: () => protector
    })

    const protectorProtectSpy = Sinon.spy(protector, 'protect')

    await libp2p.start()

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    const stream = await connection.newStream(ECHO_PROTOCOL)
    expect(stream).to.exist()
    expect(stream).to.have.property('protocol', ECHO_PROTOCOL)
    await connection.close()
    expect(protectorProtectSpy.callCount).to.equal(1)
  })

  it('should coalesce parallel dials to the same peer (id in multiaddr)', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dials = 10
    // PeerId should be in multiaddr
    expect(remoteAddr.getPeerId()).to.equal(remoteLibp2p.peerId.toString())

    await libp2p.peerStore.patch(remoteLibp2p.peerId, {
      multiaddrs: remoteLibp2p.getMultiaddrs()
    })
    const dialResults = await Promise.all([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return libp2p.dial(remoteLibp2p.peerId)
      return libp2p.dial(remoteAddr)
    }))

    // All should succeed and we should have ten results
    expect(dialResults).to.have.length(10)
    for (const connection of dialResults) {
      expect(isConnection(connection)).to.equal(true)
    }

    // 1 connection, because we know the peer in the multiaddr
    expect(libp2p.getConnections()).to.have.lengthOf(1)
    expect(remoteLibp2p.getConnections()).to.have.lengthOf(1)
  })

  it('should coalesce parallel dials to the same error on failure', async () => {
    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dials = 10
    const error = new Error('Boom')
    // @ts-expect-error private field access
    Sinon.stub(libp2p.components.transportManager, 'dial').callsFake(async () => Promise.reject(error))

    await libp2p.peerStore.patch(remoteLibp2p.peerId, {
      multiaddrs: remoteLibp2p.getMultiaddrs()
    })
    const dialResults = await Promise.allSettled([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return libp2p.dial(remoteLibp2p.peerId)
      return libp2p.dial(remoteAddr)
    }))

    // All should succeed and we should have ten results
    expect(dialResults).to.have.length(10)

    for (const result of dialResults) {
      // All errors should be the exact same as `error`
      expect(result).to.have.property('status', 'rejected')
      expect(result).to.have.property('reason', error)
    }

    // 1 connection, because we know the peer in the multiaddr
    expect(libp2p.getConnections()).to.have.lengthOf(0)
    expect(remoteLibp2p.getConnections()).to.have.lengthOf(0)
  })

  it('should dial a unix socket', async () => {
    if (os.platform() === 'win32') {
      return
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }

    const unixAddr = path.join(os.tmpdir(), `test-${Math.random()}.sock`)
    const unixMultiaddr = multiaddr('/unix' + unixAddr)

    remoteLibp2p = await createLibp2p({
      addresses: {
        listen: [
          unixMultiaddr.toString()
        ]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await remoteLibp2p.start()

    expect(fs.existsSync(unixAddr)).to.be.true()

    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await libp2p.start()

    const connection = await libp2p.dial(unixMultiaddr)

    expect(connection.remotePeer.toString()).to.equal(remoteLibp2p.peerId.toString())
  })

  it('should negotiate protocol fully when dialing a protocol', async () => {
    remoteLibp2p = await createLibp2p({
      addresses: {
        listen: [
          '/ip4/0.0.0.0/tcp/0'
        ]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await Promise.all([
      remoteLibp2p.start(),
      libp2p.start()
    ])

    const protocol = '/test/1.0.0'
    const streamOpen = pDefer<Stream>()

    await remoteLibp2p.handle(protocol, ({ stream }) => {
      streamOpen.resolve(stream)
    })

    const outboundStream = await libp2p.dialProtocol(remoteLibp2p.getMultiaddrs(), protocol)

    expect(outboundStream).to.have.property('protocol', protocol)

    await expect(streamOpen.promise).to.eventually.have.property('protocol', protocol)
  })

  it('should negotiate protocol fully when opening on a connection', async () => {
    remoteLibp2p = await createLibp2p({
      addresses: {
        listen: [
          '/ip4/0.0.0.0/tcp/0'
        ]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    libp2p = await createLibp2p({
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    })

    await Promise.all([
      remoteLibp2p.start(),
      libp2p.start()
    ])

    const protocol = '/test/1.0.0'
    const streamOpen = pDefer<Stream>()

    await remoteLibp2p.handle(protocol, ({ stream }) => {
      streamOpen.resolve(stream)
    })

    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs())
    const outboundStream = await connection.newStream(protocol)

    expect(outboundStream).to.have.property('protocol', protocol)

    await expect(streamOpen.promise).to.eventually.have.property('protocol', protocol)
  })
})
