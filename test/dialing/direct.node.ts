/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { NOISE } from '@chainsafe/libp2p-noise'
import { Multiaddr } from '@multiformats/multiaddr'

import delay from 'delay'
import pDefer from 'p-defer'
import pSettle, { PromiseResult } from 'p-settle'
import pWaitFor from 'p-wait-for'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { Connection, isConnection } from '@libp2p/interfaces/connection'
import { AbortError } from '@libp2p/interfaces/errors'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MemoryDatastore } from 'datastore-core/memory'
import { Dialer } from '../../src/connection-manager/dialer/index.js'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { codes as ErrorCodes } from '../../src/errors.js'
import { mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-compliance-tests/mocks'
import Peers from '../fixtures/peers.js'
import { Components } from '@libp2p/interfaces/components'
import { createFromJSON } from '@libp2p/peer-id-factory'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { PreSharedKeyConnectionProtector } from '../../src/pnet/index.js'
import swarmKey from '../fixtures/swarm.key.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'

const swarmKeyBuffer = uint8ArrayFromString(swarmKey)
const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')
const unsupportedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/9999/ws/p2p/QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN')

describe('Dialing (direct, TCP)', () => {
  let remoteTM: DefaultTransportManager
  let localTM: DefaultTransportManager
  let remoteAddr: Multiaddr
  let remoteComponents: Components
  let localComponents: Components

  beforeEach(async () => {
    const [localPeerId, remotePeerId] = await Promise.all([
      createFromJSON(Peers[0]),
      createFromJSON(Peers[1])
    ])

    remoteComponents = new Components({
      peerId: remotePeerId,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater(),
      peerStore: new PersistentPeerStore()
    })
    remoteComponents.setAddressManager(new DefaultAddressManager(remoteComponents, {
      listen: [
        listenAddr.toString()
      ]
    }))
    remoteTM = new DefaultTransportManager(remoteComponents)
    remoteTM.add(new TCP())

    localComponents = new Components({
      peerId: localPeerId,
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater()
    })
    localComponents.setPeerStore(new PersistentPeerStore())
    localComponents.setConnectionManager(new DefaultConnectionManager({
      maxConnections: 100,
      minConnections: 50,
      autoDialInterval: 1000
    }))

    localTM = new DefaultTransportManager(localComponents)
    localTM.add(new TCP())

    localComponents.setTransportManager(localTM)

    await remoteTM.listen([listenAddr])

    remoteAddr = remoteTM.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toString()}`)
  })

  afterEach(async () => await remoteTM.stop())

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const connection = await dialer.dial(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    await expect(dialer.dial(unsupportedAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should fail to connect if peer has no known addresses', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)
    const peerId = await createFromJSON(Peers[1])

    await expect(dialer.dial(peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should be able to connect to a given peer id', async () => {
    await localComponents.getPeerStore().addressBook.set(remoteComponents.getPeerId(), remoteTM.getAddrs())

    const dialer = new Dialer()
    dialer.init(localComponents)

    const connection = await dialer.dial(remoteComponents.getPeerId())
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    await localComponents.getPeerStore().addressBook.add(remoteComponents.getPeerId(), [unsupportedAddr])

    const dialer = new Dialer()
    dialer.init(localComponents)

    await expect(dialer.dial(remoteComponents.getPeerId()))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should only try to connect to addresses supported by the transports configured', async () => {
    const remoteAddrs = remoteTM.getAddrs()

    const peerId = await createFromJSON(Peers[1])
    await localComponents.getPeerStore().addressBook.add(peerId, [...remoteAddrs, unsupportedAddr])

    const dialer = new Dialer()
    dialer.init(localComponents)

    sinon.spy(localTM, 'dial')
    const connection = await dialer.dial(peerId)
    expect(localTM.dial).to.have.property('callCount', remoteAddrs.length)
    expect(connection).to.exist()

    await connection.close()
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new Dialer({
      dialTimeout: 50
    })
    dialer.init(localComponents)

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

  // The implementation of DialRequest is not capable of preventing more dial attempts
  // than allowed by `maxParallelDials`
  it.skip('should dial to the max concurrency', async () => {
    const addrs = [
      new Multiaddr('/ip4/0.0.0.0/tcp/8000'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8001'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8002')
    ]
    const peerId = await createFromJSON(Peers[1])

    await localComponents.getPeerStore().addressBook.add(peerId, addrs)

    const dialer = new Dialer({
      maxParallelDials: 2
    })
    dialer.init(localComponents)

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
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })
    await remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => {
      void pipe(stream, stream)
    })

    await remoteLibp2p.start()
    remoteAddr = remoteLibp2p.components.getTransportManager().getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toString()}`)
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

  it('should fail if no peer id is provided', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    await expect(libp2p.dial(remoteLibp2p.components.getTransportManager().getAddrs()[0])).to.eventually.be.rejected()
      .with.property('code', ErrorCodes.ERR_INVALID_MULTIADDR)
  })

  it('should use the dialer for connecting to a multiaddr', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const dialerDialSpy = sinon.spy(libp2p.components.getConnectionManager(), 'openConnection')

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    const { stream, protocol } = await connection.newStream(['/echo/1.0.0'])
    expect(stream).to.exist()
    expect(protocol).to.equal('/echo/1.0.0')
    expect(dialerDialSpy.callCount).to.be.greaterThan(0)
    await connection.close()
  })

  it('should use the dialer for connecting to a peer', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const dialerDialSpy = sinon.spy(libp2p.components.getConnectionManager(), 'openConnection')

    await libp2p.components.getPeerStore().addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())

    const connection = await libp2p.dial(remotePeerId)
    expect(connection).to.exist()
    const { stream, protocol } = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(protocol).to.equal('/echo/1.0.0')
    await connection.close()
    expect(dialerDialSpy.callCount).to.be.greaterThan(0)
  })

  it('should close all streams when the connection closes', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
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

    await libp2p.components.getPeerStore().addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const connection = await libp2p.dial(remotePeerId)

    // Create local to remote streams
    const { stream } = await connection.newStream('/echo/1.0.0')
    await connection.newStream('/stream-count/3')
    await libp2p.dialProtocol(remoteLibp2p.peerId, '/stream-count/4')

    // Partially write to the echo stream
    const source = pushable<Uint8Array>()
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
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
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
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
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
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ],
      connectionProtector: new PreSharedKeyConnectionProtector({
        psk: swarmKeyBuffer
      })
    })

    const protector = libp2p.components.getConnectionProtector()

    if (protector == null) {
      throw new Error('No protector was configured')
    }

    const protectorProtectSpy = sinon.spy(protector, 'protect')

    remoteLibp2p.components.setConnectionProtector(new PreSharedKeyConnectionProtector({ enabled: true, psk: swarmKeyBuffer }))

    await libp2p.start()

    const connection = await libp2p.dial(remoteAddr)
    expect(connection).to.exist()
    const { stream, protocol } = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(protocol).to.equal('/echo/1.0.0')
    await connection.close()
    expect(protectorProtectSpy.callCount).to.equal(1)
  })

  it('should coalesce parallel dials to the same peer (id in multiaddr)', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const dials = 10
    const fullAddress = remoteAddr.encapsulate(`/p2p/${remoteLibp2p.peerId.toString()}`)

    await libp2p.components.getPeerStore().addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const dialResults = await Promise.all([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return await libp2p.dial(remoteLibp2p.peerId)
      return await libp2p.dial(fullAddress)
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
        new TCP()
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const dials = 10
    const error = new Error('Boom')
    sinon.stub(libp2p.components.getTransportManager(), 'dial').callsFake(async () => await Promise.reject(error))

    await libp2p.components.getPeerStore().addressBook.set(remotePeerId, remoteLibp2p.getMultiaddrs())
    const dialResults: Array<PromiseResult<Connection>> = await pSettle([...new Array(dials)].map(async (_, index) => {
      if (index % 2 === 0) return await libp2p.dial(remoteLibp2p.peerId)
      return await libp2p.dial(remoteAddr)
    }))

    // All should succeed and we should have ten results
    expect(dialResults).to.have.length(10)

    for (const result of dialResults) {
      expect(result).to.have.property('isRejected', true)
      expect(result).to.have.property('reason').that.has.property('name', 'AggregateError')

      // All errors should be the exact same as `error`
      // @ts-expect-error reason is any
      for (const err of result.reason.errors) {
        expect(err).to.equal(error)
      }
    }

    // 1 connection, because we know the peer in the multiaddr
    expect(libp2p.getConnections()).to.have.lengthOf(0)
    expect(remoteLibp2p.getConnections()).to.have.lengthOf(0)
  })
})
