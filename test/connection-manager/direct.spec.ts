/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import pDefer from 'p-defer'
import delay from 'delay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import { AbortError } from '@libp2p/interfaces/errors'
import { MemoryDatastore } from 'datastore-core/memory'
import { codes as ErrorCodes } from '../../src/errors.js'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-mocks'
import { createPeerId } from '../utils/creators/peer.js'
import type { TransportManager } from '@libp2p/interface-transport'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Connection } from '@libp2p/interface-connection'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import Peers from '../fixtures/peers.js'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { pEvent } from 'p-event'
import { DefaultComponents } from '../../src/components.js'
import { stubInterface } from 'sinon-ts'
import { yamux } from '@chainsafe/libp2p-yamux'

const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999')

describe('dialing (direct, WebSockets)', () => {
  let localTM: TransportManager
  let localComponents: DefaultComponents
  let remoteAddr: Multiaddr
  let remoteComponents: DefaultComponents

  beforeEach(async () => {
    localComponents = new DefaultComponents({
      peerId: await createFromJSON(Peers[0]),
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader(),
      connectionGater: mockConnectionGater(),
      transportManager: stubInterface<TransportManager>()
    })
    localComponents.peerStore = new PersistentPeerStore(localComponents, {
      addressFilter: localComponents.connectionGater.filterMultiaddrForPeer
    })
    localComponents.connectionManager = new DefaultConnectionManager(localComponents, {
      maxConnections: 100,
      minConnections: 50,
      inboundUpgradeTimeout: 1000
    })

    localTM = new DefaultTransportManager(localComponents)
    localTM.add(webSockets({ filter: filters.all })())
    localComponents.transportManager = localTM

    // this peer is spun up in .aegir.cjs
    remoteAddr = MULTIADDRS_WEBSOCKETS[0]
    remoteComponents = new DefaultComponents({
      peerId: peerIdFromString(remoteAddr.getPeerId() ?? '')
    })
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.addressBook.set(remotePeerId, [remoteAddr])

    const connection = await connectionManager.openConnection(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    await expect(connectionManager.openConnection(unsupportedAddr.encapsulate(`/p2p/${remoteComponents.peerId.toString()}`)))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should be able to connect to a given peer', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.addressBook.set(remotePeerId, [remoteAddr])

    const connection = await connectionManager.openConnection(remotePeerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.addressBook.set(remotePeerId, [unsupportedAddr])

    await expect(connectionManager.openConnection(remotePeerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should abort dials on queue task timeout', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents, {
      dialTimeout: 50
    })

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.addressBook.set(remotePeerId, [remoteAddr])

    sinon.stub(localTM, 'dial').callsFake(async (addr, options) => {
      expect(options.signal).to.exist()
      expect(options.signal.aborted).to.equal(false)
      expect(addr.toString()).to.eql(remoteAddr.toString())
      await delay(60)
      expect(options.signal.aborted).to.equal(true)
      throw new AbortError()
    })

    await expect(connectionManager.openConnection(remoteAddr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should throw when a peer advertises more than the allowed number of addresses', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents, {
      maxPeerAddrsToDial: 10
    })

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.addressBook.set(remotePeerId, Array.from({ length: 11 }, (_, i) => multiaddr(`/ip4/127.0.0.1/tcp/1500${i}/ws/p2p/12D3KooWHFKTMzwerBtsVmtz4ZZEQy2heafxzWw6wNn5PPYkBxJ5`)))

    await expect(connectionManager.openConnection(remotePeerId))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TOO_MANY_ADDRESSES)
  })

  it('should sort addresses on dial', async () => {
    const peerMultiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/15001/ws'),
      multiaddr('/ip4/20.0.0.1/tcp/15001/ws'),
      multiaddr('/ip4/30.0.0.1/tcp/15001/ws')
    ]

    const publicAddressesFirstSpy = sinon.spy(publicAddressesFirst)
    const localTMDialStub = sinon.stub(localTM, 'dial').callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), remoteComponents.peerId)))

    const connectionManager = new DefaultConnectionManager(localComponents, {
      addressSorter: publicAddressesFirstSpy,
      maxParallelDials: 3
    })

    // Inject data into the AddressBook
    await localComponents.peerStore.addressBook.add(remoteComponents.peerId, peerMultiaddrs)

    // Perform 3 multiaddr dials
    await connectionManager.openConnection(remoteComponents.peerId)

    const sortedAddresses = peerMultiaddrs
      .map((m) => ({ multiaddr: m, isCertified: false }))
      .sort(publicAddressesFirst)

    expect(localTMDialStub.getCall(0).args[0].equals(sortedAddresses[0].multiaddr))
    expect(localTMDialStub.getCall(1).args[0].equals(sortedAddresses[1].multiaddr))
    expect(localTMDialStub.getCall(2).args[0].equals(sortedAddresses[2].multiaddr))
  })

  it('shutting down should abort pending dials', async () => {
    const addrs = [
      multiaddr('/ip4/0.0.0.0/tcp/8000/ws'),
      multiaddr('/ip4/0.0.0.0/tcp/8001/ws'),
      multiaddr('/ip4/0.0.0.0/tcp/8002/ws')
    ]
    const connectionManager = new DefaultConnectionManager(localComponents, {
      maxParallelDials: 2
    })

    // Inject data into the AddressBook
    await localComponents.peerStore.addressBook.add(remoteComponents.peerId, addrs)

    sinon.stub(localTM, 'dial').callsFake(async (_, options) => {
      const deferredDial = pDefer<Connection>()
      const onAbort = (): void => {
        options.signal.removeEventListener('abort', onAbort)
        deferredDial.reject(new AbortError())
      }
      options.signal.addEventListener('abort', onAbort)
      return await deferredDial.promise
    })

    // Perform 3 multiaddr dials
    const dialPromise = connectionManager.openConnection(remoteComponents.peerId)

    // Let the call stack run
    await delay(0)

    try {
      await connectionManager.stop()
      await dialPromise
      expect.fail('should have failed')
    } catch {
      expect(connectionManager.getDialQueue()).to.have.lengthOf(0) // 0 dial requests
    }
  })

  it('should dial all multiaddrs for a passed peer id', async () => {
    const addrs = [
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8002/ws/p2p/${remoteComponents.peerId.toString()}`)
    ]

    // Inject data into the AddressBook
    await localComponents.peerStore.addressBook.add(remoteComponents.peerId, addrs)

    const connectionManager = new DefaultConnectionManager(localComponents)

    const transactionManagerDialStub = sinon.stub(localTM, 'dial')
    transactionManagerDialStub.callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), remoteComponents.peerId)))

    // Perform dial
    await connectionManager.openConnection(remoteComponents.peerId)
    await connectionManager.stop()

    expect(transactionManagerDialStub).to.have.property('callCount', 3)
  })

  it('should dial only the multiaddr that is passed', async () => {
    const addrs = [
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8002/ws/p2p/${remoteComponents.peerId.toString()}`)
    ]

    // Inject data into the AddressBook
    await localComponents.peerStore.addressBook.add(remoteComponents.peerId, addrs)

    // different address not in the address book, same peer id
    const dialMultiaddr = multiaddr(`/ip4/0.0.0.0/tcp/8003/ws/p2p/${remoteComponents.peerId.toString()}`)

    const connectionManager = new DefaultConnectionManager(localComponents)

    const transactionManagerDialStub = sinon.stub(localTM, 'dial')
    transactionManagerDialStub.callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), remoteComponents.peerId)))

    // Perform dial
    await connectionManager.openConnection(dialMultiaddr)
    await connectionManager.stop()

    expect(transactionManagerDialStub).to.have.property('callCount', 1)
    expect(transactionManagerDialStub.getCall(0).args[0].toString()).to.equal(dialMultiaddr.toString())
  })

  it('should throw if dialling an empty array is attempted', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    // Perform dial
    await expect(connectionManager.openConnection([])).to.eventually.rejected
      .with.property('code', 'ERR_NO_VALID_ADDRESSES')

    await connectionManager.stop()
  })

  it('should throw if dialling multiaddrs with mismatched peer ids', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    // Perform dial
    await expect(connectionManager.openConnection([
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(await createPeerId()).toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${(await createPeerId()).toString()}`)
    ])).to.eventually.rejected
      .with.property('code', 'ERR_INVALID_PARAMETERS')

    await connectionManager.stop()
  })

  it('should throw if dialling multiaddrs with inconsistent peer ids', async () => {
    const connectionManager = new DefaultConnectionManager(localComponents)

    // Perform dial
    await expect(connectionManager.openConnection([
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(await createPeerId()).toString()}`),
      multiaddr('/ip4/0.0.0.0/tcp/8001/ws')
    ])).to.eventually.rejected
      .with.property('code', 'ERR_INVALID_PARAMETERS')

    // Perform dial
    await expect(connectionManager.openConnection([
      multiaddr('/ip4/0.0.0.0/tcp/8001/ws'),
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(await createPeerId()).toString()}`)
    ])).to.eventually.rejected
      .with.property('code', 'ERR_INVALID_PARAMETERS')

    await connectionManager.stop()
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

  it('should use the connection manager for connecting', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        webSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    const dialerDialSpy = sinon.spy(libp2p.components.connectionManager, 'openConnection')

    await libp2p.start()

    const connection = await libp2p.dial(MULTIADDRS_WEBSOCKETS[0])
    expect(connection).to.exist()
    const stream = await connection.newStream('/echo/1.0.0')
    expect(stream).to.exist()
    expect(stream).to.have.nested.property('stat.protocol', '/echo/1.0.0')
    await connection.close()
    expect(dialerDialSpy.callCount).to.be.at.least(1)

    await libp2p.stop()
  })

  it('should run identify automatically after connecting', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        webSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    if (libp2p.identifyService == null) {
      throw new Error('Identify service missing')
    }

    const identifySpy = sinon.spy(libp2p.identifyService, 'identify')
    const protobookSetSpy = sinon.spy(libp2p.components.peerStore.protoBook, 'set')
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
        webSockets({
          filter: filters.all
        })
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
        webSockets({
          filter: filters.all
        })
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    await libp2p.hangUp(MULTIADDRS_WEBSOCKETS[0])
  })

  it('should abort pending dials on stop', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        webSockets({
          filter: filters.all
        })
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

    const connectionManager = libp2p.components.connectionManager as DefaultConnectionManager
    const dialerDestroyStub = sinon.spy(connectionManager.dialQueue, 'stop')

    await libp2p.stop()

    expect(dialerDestroyStub.callCount).to.equal(1)
  })

  it('should fail to dial self', async () => {
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        webSockets({
          filter: filters.all
        })
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

    await expect(libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/1234/ws/p2p/${peerId.toString()}`)))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_DIALED_SELF)
  })
})
