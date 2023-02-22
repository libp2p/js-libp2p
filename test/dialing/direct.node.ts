/* eslint-env mocha */

import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { plaintext } from '../../src/insecure/index.js'

import { Connection, isConnection } from '@libp2p/interface-connection'
import { mockConnection, mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader } from '@libp2p/interface-mocks'
import type { PeerId } from '@libp2p/interface-peer-id'
import { AbortError } from '@libp2p/interfaces/errors'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import pDefer from 'p-defer'
import pSettle, { PromiseResult } from 'p-settle'
import pWaitFor from 'p-wait-for'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { DefaultComponents } from '../../src/components.js'
import { DefaultDialer } from '../../src/connection-manager/dialer/index.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { codes as ErrorCodes } from '../../src/errors.js'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { preSharedKey } from '../../src/pnet/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import Peers from '../fixtures/peers.js'
import swarmKey from '../fixtures/swarm.key.js'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { peerIdFromString } from '@libp2p/peer-id'

const swarmKeyBuffer = uint8ArrayFromString(swarmKey)
const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws/p2p/QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN')

describe('Dialing (direct, TCP)', () => {
  let remoteTM: DefaultTransportManager
  let localTM: DefaultTransportManager
  let remoteAddr: Multiaddr
  let remoteComponents: DefaultComponents
  let localComponents: DefaultComponents
  let resolver: sinon.SinonStub<[Multiaddr], Promise<string[]>>

  beforeEach(async () => {
    resolver = sinon.stub<[Multiaddr], Promise<string[]>>()
    const [localPeerId, remotePeerId] = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1])
    ])

    remoteComponents = new DefaultComponents({
      peerId: remotePeerId,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater()
    })
    remoteComponents.peerStore = new PersistentPeerStore(remoteComponents)
    remoteComponents.addressManager = new DefaultAddressManager(remoteComponents, {
      listen: [
        listenAddr.toString()
      ]
    })
    remoteTM = new DefaultTransportManager(remoteComponents)
    remoteTM.add(tcp()())

    localComponents = new DefaultComponents({
      peerId: localPeerId,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater()
    })
    localComponents.peerStore = new PersistentPeerStore(localComponents)
    localComponents.connectionManager = new DefaultConnectionManager(localComponents, {
      maxConnections: 100,
      minConnections: 50,
      autoDialInterval: 1000,
      inboundUpgradeTimeout: 1000
    })

    localTM = new DefaultTransportManager(localComponents)
    localTM.add(tcp()())

    localComponents.transportManager = localTM

    await remoteTM.listen([listenAddr])

    remoteAddr = remoteTM.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toString()}`)
  })

  afterEach(async () => await remoteTM.stop())

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new DefaultDialer(localComponents)

    const connection = await dialer.dial(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to remote node with duplicated addresses', async () => {
    const dnsaddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteAddr.getPeerId() ?? ''}`)
    await localComponents.peerStore.addressBook.add(peerIdFromString(remoteAddr.getPeerId() ?? ''), [dnsaddr])
    const dialer = new DefaultDialer(localComponents, { resolvers: { dnsaddr: resolver }, maxAddrsToDial: 1 })

    // Resolver stub
    resolver.onCall(1).resolves([remoteAddr.toString()])

    const connection = await dialer.dial(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new DefaultDialer(localComponents)

    await expect(dialer.dial(unsupportedAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should fail to connect if peer has no known addresses', async () => {
    const dialer = new DefaultDialer(localComponents)
    const peerId = await createFromJSON(Peers[1])

    await expect(dialer.dial(peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should be able to connect to a given peer id', async () => {
    await localComponents.peerStore.addressBook.set(remoteComponents.peerId, remoteTM.getAddrs())

    const dialer = new DefaultDialer(localComponents)

    const connection = await dialer.dial(remoteComponents.peerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    await localComponents.peerStore.addressBook.add(remoteComponents.peerId, [unsupportedAddr])

    const dialer = new DefaultDialer(localComponents)

    await expect(dialer.dial(remoteComponents.peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should only try to connect to addresses supported by the transports configured', async () => {
    const remoteAddrs = remoteTM.getAddrs()

    const peerId = await createFromJSON(Peers[1])
    await localComponents.peerStore.addressBook.add(peerId, [...remoteAddrs, unsupportedAddr])

    const dialer = new DefaultDialer(localComponents)

    sinon.spy(localTM, 'dial')
    const connection = await dialer.dial(peerId)
    expect(localTM.dial).to.have.property('callCount', remoteAddrs.length)
    expect(connection).to.exist()

    await connection.close()
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new DefaultDialer(localComponents, {
      dialTimeout: 50
    })

    sinon.stub(localTM, 'dial').callsFake(async (addr, options = {}) => {
      expect(options.signal).to.exist()
      expect(options.signal?.aborted).to.equal(false)
      expect(addr.toString()).to.eql(remoteAddr.toString())
      await delay(60)
      expect(options.signal?.aborted).to.equal(true)
      throw new AbortError()
    })

    await expect(dialer.dial(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should dial to the max concurrency', async () => {
    const addrs = [
      multiaddr('/ip4/0.0.0.0/tcp/8000'),
      multiaddr('/ip4/0.0.0.0/tcp/8001'),
      multiaddr('/ip4/0.0.0.0/tcp/8002')
    ]
    const peerId = await createFromJSON(Peers[1])

    await localComponents.peerStore.addressBook.add(peerId, addrs)

    const dialer = new DefaultDialer(localComponents, {
      maxParallelDials: 2
    })

    expect(dialer.tokens).to.have.lengthOf(2)

    const deferredDial = pDefer<Connection>()
    sinon.stub(localTM, 'dial').callsFake(async () => await deferredDial.promise)

    // Perform 3 multiaddr dials
    void dialer.dial(peerId)

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.lengthOf(0)

    deferredDial.resolve(mockConnection(mockMultiaddrConnection(mockDuplex(), peerId)))

    // Let the call stack run
    await delay(0)

    // Only two dials should be executed, as the first dial will succeed
    expect(localTM.dial).to.have.property('callCount', 2)
    expect(dialer.tokens).to.have.lengthOf(2)
  })
})

describe('libp2p.dialer (direct, TCP)', () => {
  let peerId: PeerId, remotePeerId: PeerId
  let libp2p: Libp2pNode
  let remoteLibp2p: Libp2pNode
  let remoteAddr: Multiaddr

  beforeEach(async () => {
    [peerId, remotePeerId] = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1])
    ])

    remoteLibp2p = await createLibp2pNode({
      peerId: remotePeerId,
      addresses: {
        listen: [listenAddr.toString()]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })
    await remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    })

    await remoteLibp2p.start()
    remoteAddr = remoteLibp2p.components.transportManager.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toString()}`)
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

  it('should use the dialer for connecting to a multiaddr', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dialerDialSpy = sinon.spy(libp2p.connectionManager, 'openConnection')

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    const stream = await connection.newStream(['/echo/1.0.0'])
    expect(stream).to.exist()
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')
    expect(dialerDialSpy.callCount).to.be.greaterThan(0)
    await connection.close()
  })

  it('should use the dialer for connecting to a peer', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dialerDialSpy = sinon.spy(libp2p.connectionManager, 'openConnection')

    await libp2p.components.peerStore.addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())

    const connection = await libp2p.dial(remotePeerId)
    expect(connection).to.exist()
    const stream = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')
    await connection.close()
    expect(dialerDialSpy.callCount).to.be.greaterThan(0)
  })

  it('should close all streams when the connection closes', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
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

    await libp2p.components.peerStore.addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const connection = await libp2p.dial(remotePeerId)

    // Create local to remote streams
    const stream = await connection.newStream('/echo/1.0.0')
    await connection.newStream('/stream-count/3')
    await libp2p.dialProtocol(remoteLibp2p.peerId, '/stream-count/4')

    // Partially write to the echo stream
    const source = pushable()
    void stream.sink(source)
    source.push(uint8ArrayFromString('hello'))

    // Create remote to local streams
    await remoteLibp2p.dialProtocol(libp2p.peerId, '/stream-count/1')
    await remoteLibp2p.dialProtocol(libp2p.peerId, '/stream-count/2')

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
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    // @ts-expect-error invalid params
    await expect(libp2p.dialProtocol(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('code', ErrorCodes.ERR_INVALID_PROTOCOLS_FOR_STREAM)

    await expect(libp2p.dialProtocol(remoteAddr, []))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('code', ErrorCodes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
  })

  it('should be able to use hangup to close connections', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    expect(connection.stat.timeline.close).to.not.exist()
    await libp2p.hangUp(connection.remotePeer)
    expect(connection.stat.timeline.close).to.exist()
  })

  it('should use the protectors when provided for connecting', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ],
      connectionProtector: preSharedKey({
        psk: swarmKeyBuffer
      })
    })

    const protector = libp2p.components.connectionProtector

    if (protector == null) {
      throw new Error('No protector was configured')
    }

    const protectorProtectSpy = sinon.spy(protector, 'protect')

    remoteLibp2p.components.connectionProtector = preSharedKey({ enabled: true, psk: swarmKeyBuffer })()

    await libp2p.start()

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    const stream = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')
    await connection.close()
    expect(protectorProtectSpy.callCount).to.equal(1)
  })

  it('should coalesce parallel dials to the same peer (id in multiaddr)', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dials = 10
    // PeerId should be in multiaddr
    expect(remoteAddr.getPeerId()).to.equal(remoteLibp2p.peerId.toString())

    await libp2p.components.peerStore.addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const dialResults = await Promise.all([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return await libp2p.dial(remoteLibp2p.peerId)
      return await libp2p.dial(remoteAddr)
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
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const dials = 10
    const error = new Error('Boom')
    sinon.stub(libp2p.components.transportManager, 'dial').callsFake(async () => await Promise.reject(error))

    await libp2p.components.peerStore.addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const dialResults: Array<PromiseResult<Connection>> = await pSettle([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return await libp2p.dial(remoteLibp2p.peerId)
      return await libp2p.dial(remoteAddr)
    }))

    // All should succeed and we should have ten results
    expect(dialResults).to.have.length(10)

    for (const result of dialResults) {
      expect(result).to.have.property('isRejected', true)

      // All errors should be the exact same as `error`
      // @ts-expect-error reason is any
      expect(result.reason).to.equal(error)
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

    remoteLibp2p = await createLibp2pNode({
      peerId: remotePeerId,
      addresses: {
        listen: [
          unixMultiaddr.toString()
        ]
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await remoteLibp2p.start()

    expect(fs.existsSync(unixAddr)).to.be.true()

    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        tcp()
      ],
      streamMuxers: [
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.start()

    const connection = await libp2p.dial(unixMultiaddr)

    expect(connection.remotePeer.toString()).to.equal(remotePeerId.toString())
  })
})
