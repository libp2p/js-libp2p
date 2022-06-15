/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import pDefer from 'p-defer'
import delay from 'delay'
import { WebSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { Mplex } from '@libp2p/mplex'
import { NOISE } from '@chainsafe/libp2p-noise'
import { Multiaddr } from '@multiformats/multiaddr'
import { AbortError } from '@libp2p/interfaces/errors'
import { MemoryDatastore } from 'datastore-core/memory'
import { codes as ErrorCodes } from '../../src/errors.js'
import * as Constants from '../../src/constants.js'
import { Dialer, DialTarget } from '../../src/connection-manager/dialer/index.js'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-mocks'
import { createPeerId } from '../utils/creators/peer.js'
import type { TransportManager } from '@libp2p/interface-transport'
import { Components } from '@libp2p/components'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Connection } from '@libp2p/interface-connection'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import Peers from '../fixtures/peers.js'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { pEvent } from 'p-event'

const unsupportedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/9999')

describe('Dialing (direct, WebSockets)', () => {
  let localTM: TransportManager
  let localComponents: Components
  let remoteAddr: Multiaddr
  let remoteComponents: Components

  beforeEach(async () => {
    localComponents = new Components({
      peerId: await createFromJSON(Peers[0]),
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater()
    })
    localComponents.setPeerStore(new PersistentPeerStore({
      addressFilter: localComponents.getConnectionGater().filterMultiaddrForPeer
    }))
    localComponents.setConnectionManager(new DefaultConnectionManager({
      maxConnections: 100,
      minConnections: 50,
      autoDialInterval: 1000
    }))

    localTM = new DefaultTransportManager(localComponents)
    localTM.add(new WebSockets({ filter: filters.all }))
    localComponents.setTransportManager(localTM)

    // this peer is spun up in .aegir.cjs
    remoteAddr = MULTIADDRS_WEBSOCKETS[0]
    remoteComponents = new Components({
      peerId: peerIdFromString(remoteAddr.getPeerId() ?? '')
    })
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should limit the number of tokens it provides', () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const maxPerPeer = Constants.MAX_PER_PEER_DIALS
    expect(dialer.tokens).to.have.lengthOf(Constants.MAX_PARALLEL_DIALS)
    const tokens = dialer.getTokens(maxPerPeer + 1)
    expect(tokens).to.have.length(maxPerPeer)
    expect(dialer.tokens).to.have.lengthOf(Constants.MAX_PARALLEL_DIALS - maxPerPeer)
  })

  it('should not return tokens if none are left', () => {
    const dialer = new Dialer({
      maxDialsPerPeer: Infinity
    })
    dialer.init(localComponents)

    const maxTokens = dialer.tokens.length

    const tokens = dialer.getTokens(maxTokens)

    expect(tokens).to.have.lengthOf(maxTokens)
    expect(dialer.getTokens(1)).to.be.empty()
  })

  it('should NOT be able to return a token twice', () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const tokens = dialer.getTokens(1)
    expect(tokens).to.have.length(1)
    expect(dialer.tokens).to.have.lengthOf(Constants.MAX_PARALLEL_DIALS - 1)
    dialer.releaseToken(tokens[0])
    dialer.releaseToken(tokens[0])
    expect(dialer.tokens).to.have.lengthOf(Constants.MAX_PARALLEL_DIALS)
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.getPeerStore().addressBook.set(remotePeerId, [remoteAddr])

    const connection = await dialer.dial(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    await expect(dialer.dial(unsupportedAddr.encapsulate(`/p2p/${remoteComponents.getPeerId().toString()}`)))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should be able to connect to a given peer', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.getPeerStore().addressBook.set(remotePeerId, [remoteAddr])

    const connection = await dialer.dial(remotePeerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.getPeerStore().addressBook.set(remotePeerId, [unsupportedAddr])

    await expect(dialer.dial(remotePeerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new Dialer({
      dialTimeout: 50
    })
    dialer.init(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.getPeerStore().addressBook.set(remotePeerId, [remoteAddr])

    sinon.stub(localTM, 'dial').callsFake(async (addr, options) => {
      expect(options.signal).to.exist()
      expect(options.signal.aborted).to.equal(false)
      expect(addr.toString()).to.eql(remoteAddr.toString())
      await delay(60)
      expect(options.signal.aborted).to.equal(true)
      throw new AbortError()
    })

    await expect(dialer.dial(remoteAddr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should throw when a peer advertises more than the allowed number of peers', async () => {
    const dialer = new Dialer({
      maxAddrsToDial: 10
    })
    dialer.init(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.getPeerStore().addressBook.set(remotePeerId, Array.from({ length: 11 }, (_, i) => new Multiaddr(`/ip4/127.0.0.1/tcp/1500${i}/ws/p2p/12D3KooWHFKTMzwerBtsVmtz4ZZEQy2heafxzWw6wNn5PPYkBxJ5`)))

    await expect(dialer.dial(remoteAddr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TOO_MANY_ADDRESSES)
  })

  it('should sort addresses on dial', async () => {
    const peerMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/15001/ws'),
      new Multiaddr('/ip4/20.0.0.1/tcp/15001/ws'),
      new Multiaddr('/ip4/30.0.0.1/tcp/15001/ws')
    ]

    const publicAddressesFirstSpy = sinon.spy(publicAddressesFirst)
    const localTMDialStub = sinon.stub(localTM, 'dial').callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), peerIdFromString(ma.getPeerId() ?? ''))))

    const dialer = new Dialer({
      addressSorter: publicAddressesFirstSpy,
      maxParallelDials: 3
    })
    dialer.init(localComponents)

    // Inject data in the AddressBook
    await localComponents.getPeerStore().addressBook.add(remoteComponents.getPeerId(), peerMultiaddrs)

    // Perform 3 multiaddr dials
    await dialer.dial(remoteComponents.getPeerId())

    const sortedAddresses = peerMultiaddrs
      .map((m) => ({ multiaddr: m, isCertified: false }))
      .sort(publicAddressesFirst)

    expect(localTMDialStub.getCall(0).args[0].equals(sortedAddresses[0].multiaddr))
    expect(localTMDialStub.getCall(1).args[0].equals(sortedAddresses[1].multiaddr))
    expect(localTMDialStub.getCall(2).args[0].equals(sortedAddresses[2].multiaddr))
  })

  it('should dial to the max concurrency', async () => {
    const addrs = [
      new Multiaddr('/ip4/0.0.0.0/tcp/8000/ws'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8001/ws'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8002/ws')
    ]
    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')

    const dialer = new Dialer({
      maxParallelDials: 2
    })
    dialer.init(localComponents)

    // Inject data in the AddressBook
    await localComponents.getPeerStore().addressBook.add(remotePeerId, addrs)

    expect(dialer.tokens).to.have.lengthOf(2)

    const deferredDial = pDefer<Connection>()
    const localTMDialStub = sinon.stub(localTM, 'dial').callsFake(async () => await deferredDial.promise)

    // Perform 3 multiaddr dials
    void dialer.dial(remotePeerId)

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.lengthOf(0)

    deferredDial.resolve(mockConnection(mockMultiaddrConnection(mockDuplex(), remotePeerId)))

    // Let the call stack run
    await delay(0)

    // Only two dials will be run, as the first two succeeded
    expect(localTMDialStub.callCount).to.equal(2)
    expect(dialer.tokens).to.have.lengthOf(2)
    expect(dialer.pendingDials.size).to.equal(0)
  })

  it('.destroy should abort pending dials', async () => {
    const addrs = [
      new Multiaddr('/ip4/0.0.0.0/tcp/8000/ws'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8001/ws'),
      new Multiaddr('/ip4/0.0.0.0/tcp/8002/ws')
    ]
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    dialer.init(localComponents)

    // Inject data in the AddressBook
    await localComponents.getPeerStore().addressBook.add(remoteComponents.getPeerId(), addrs)

    expect(dialer.tokens).to.have.lengthOf(2)

    sinon.stub(localTM, 'dial').callsFake(async (_, options) => {
      const deferredDial = pDefer<Connection>()
      const onAbort = () => {
        options.signal.removeEventListener('abort', onAbort)
        deferredDial.reject(new AbortError())
      }
      options.signal.addEventListener('abort', onAbort)
      return await deferredDial.promise
    })

    // Perform 3 multiaddr dials
    const dialPromise = dialer.dial(remoteComponents.getPeerId())

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.length(0)
    expect(dialer.pendingDials.size).to.equal(1) // 1 dial request

    try {
      await dialer.stop()
      await dialPromise
      expect.fail('should have failed')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateError')
      expect(dialer.pendingDials.size).to.equal(0) // 1 dial request
    }
  })

  it('should cancel pending dial targets before proceeding', async () => {
    const dialer = new Dialer()
    dialer.init(localComponents)

    sinon.stub(dialer, '_createDialTarget').callsFake(async () => {
      const deferredDial = pDefer<DialTarget>()
      return await deferredDial.promise
    })

    // Perform dial
    const dialPromise = dialer.dial(remoteComponents.getPeerId())

    // Let the call stack run
    await delay(0)

    await dialer.stop()

    await expect(dialPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('code', 'ABORT_ERR')
  })
})

describe('libp2p.dialer (direct, WebSockets)', () => {
  // const connectionGater = mockConnectionGater()
  let libp2p: Libp2pNode
  let peerId: PeerId

  beforeEach(async () => {
    peerId = await createPeerId()
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should create a dialer', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const dialer = connectionManager.dialer

    expect(dialer).to.exist()
    expect(dialer).to.have.property('tokens').with.lengthOf(Constants.MAX_PARALLEL_DIALS)
    expect(dialer).to.have.property('maxDialsPerPeer', Constants.MAX_PER_PEER_DIALS)
    expect(dialer).to.have.property('timeout', Constants.DIAL_TIMEOUT)
  })

  it('should be able to override dialer options', async () => {
    const config = {
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ],
      connectionManager: {
        maxParallelDials: 10,
        maxDialsPerPeer: 1,
        dialTimeout: 1e3 // 30 second dial timeout per peer
      }
    }
    libp2p = await createLibp2pNode(config)

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const dialer = connectionManager.dialer

    expect(dialer).to.exist()
    expect(dialer).to.have.property('tokens').with.lengthOf(config.connectionManager.maxParallelDials)
    expect(dialer).to.have.property('maxDialsPerPeer', config.connectionManager.maxDialsPerPeer)
    expect(dialer).to.have.property('timeout', config.connectionManager.dialTimeout)
  })

  it('should use the dialer for connecting', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const dialerDialSpy = sinon.spy(connectionManager.dialer, 'dial')
    const addressBookAddSpy = sinon.spy(libp2p.components.getPeerStore().addressBook, 'add')

    await libp2p.start()

    const connection = await libp2p.dial(MULTIADDRS_WEBSOCKETS[0])
    expect(connection).to.exist()
    const { stream, protocol } = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(protocol).to.equal('/echo/1.0.0')
    await connection.close()
    expect(dialerDialSpy.callCount).to.be.at.least(1)
    expect(addressBookAddSpy.callCount).to.be.at.least(1)

    await libp2p.stop()
  })

  it('should run identify automatically after connecting', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    if (libp2p.identifyService == null) {
      throw new Error('Identify service missing')
    }

    const identifySpy = sinon.spy(libp2p.identifyService, 'identify')
    const protobookSetSpy = sinon.spy(libp2p.components.getPeerStore().protoBook, 'set')
    const connectionPromise = pEvent(libp2p.connectionManager, 'peer:connect')

    await libp2p.start()

    const connection = await libp2p.dial(MULTIADDRS_WEBSOCKETS[0])
    expect(connection).to.exist()

    // Wait for connection event to be emitted
    await connectionPromise

    expect(identifySpy.callCount).to.equal(1)
    await identifySpy.firstCall.returnValue

    expect(protobookSetSpy.callCount).to.equal(1)

    await libp2p.stop()
  })

  it('should be able to use hangup to close connections', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const connection = await libp2p.dial(MULTIADDRS_WEBSOCKETS[0])
    expect(connection).to.exist()
    expect(connection.stat.timeline.close).to.not.exist()

    await libp2p.hangUp(connection.remotePeer)
    expect(connection.stat.timeline.close).to.exist()

    await libp2p.stop()
  })

  it('should be able to use hangup when no connection exists', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.hangUp(MULTIADDRS_WEBSOCKETS[0])
  })

  it('should cancel pending dial targets and stop', async () => {
    const remotePeerId = await createPeerId()

    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    sinon.stub(connectionManager.dialer, '_createDialTarget').callsFake(async () => {
      const deferredDial = pDefer<DialTarget>()
      return await deferredDial.promise
    })

    await libp2p.start()

    // Perform dial
    const dialPromise = libp2p.dial(remotePeerId)

    // Let the call stack run
    await delay(0)

    await libp2p.stop()

    await expect(dialPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('code', 'ABORT_ERR')
  })

  it('should abort pending dials on stop', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const dialerDestroyStub = sinon.spy(connectionManager.dialer, 'stop')

    await libp2p.stop()

    expect(dialerDestroyStub.callCount).to.equal(1)
  })

  it('should fail to dial self', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        new WebSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        new Mplex()
      ],
      connectionEncryption: [
        NOISE
      ]
    })

    await libp2p.start()

    await expect(libp2p.dial(new Multiaddr(`/ip4/127.0.0.1/tcp/1234/ws/p2p/${peerId.toString()}`)))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_DIALED_SELF)
  })
})
