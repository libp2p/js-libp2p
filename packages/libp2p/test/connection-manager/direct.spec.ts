/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { mockConnectionGater, mockDuplex, mockMultiaddrConnection, mockUpgrader, mockConnection } from '@libp2p/interface-mocks'
import { AbortError } from '@libp2p/interfaces/errors'
import { EventEmitter } from '@libp2p/interfaces/events'
import { mplex } from '@libp2p/mplex'
import { peerIdFromString } from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import pDefer from 'p-defer'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { codes as ErrorCodes } from '../../src/errors.js'
import { identifyService } from '../../src/identify/index.js'
import { createLibp2p } from '../../src/index.js'
import { plaintext } from '../../src/insecure/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { DefaultIdentifyService } from '../../src/identify/identify.js'
import type { Connection } from '@libp2p/interface-connection'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { TransportManager } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'

const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999')
const relayMultiaddr = multiaddr(process.env.RELAY_MULTIADDR)

describe('dialing (direct, WebSockets)', () => {
  let localTM: TransportManager
  let localComponents: Components
  let remoteAddr: Multiaddr
  let remoteComponents: Components
  let connectionManager: DefaultConnectionManager

  beforeEach(async () => {
    const localEvents = new EventEmitter()
    localComponents = defaultComponents({
      peerId: await createEd25519PeerId(),
      datastore: new MemoryDatastore(),
      upgrader: mockUpgrader({ events: localEvents }),
      connectionGater: mockConnectionGater(),
      transportManager: stubInterface<TransportManager>(),
      events: localEvents
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
    remoteAddr = relayMultiaddr
    remoteComponents = defaultComponents({
      peerId: peerIdFromString(remoteAddr.getPeerId() ?? '')
    })
  })

  afterEach(async () => {
    sinon.restore()

    if (connectionManager != null) {
      await connectionManager.stop()
    }
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.patch(remotePeerId, {
      multiaddrs: [remoteAddr]
    })

    const connection = await connectionManager.openConnection(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    await expect(connectionManager.openConnection(unsupportedAddr.encapsulate(`/p2p/${remoteComponents.peerId.toString()}`)))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should be able to connect to a given peer', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.patch(remotePeerId, {
      multiaddrs: [remoteAddr]
    })

    const connection = await connectionManager.openConnection(remotePeerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.patch(remotePeerId, {
      multiaddrs: [unsupportedAddr]
    })

    await expect(connectionManager.openConnection(remotePeerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })

  it('should abort dials on queue task timeout', async () => {
    connectionManager = new DefaultConnectionManager(localComponents, {
      dialTimeout: 50
    })
    await connectionManager.start()

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.patch(remotePeerId, {
      multiaddrs: [remoteAddr]
    })

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
    connectionManager = new DefaultConnectionManager(localComponents, {
      maxPeerAddrsToDial: 10
    })
    await connectionManager.start()

    const remotePeerId = peerIdFromString(remoteAddr.getPeerId() ?? '')
    await localComponents.peerStore.patch(remotePeerId, {
      multiaddrs: Array.from({ length: 11 }, (_, i) => multiaddr(`/ip4/127.0.0.1/tcp/1500${i}/ws/p2p/12D3KooWHFKTMzwerBtsVmtz4ZZEQy2heafxzWw6wNn5PPYkBxJ5`))
    })

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

    connectionManager = new DefaultConnectionManager(localComponents, {
      addressSorter: publicAddressesFirstSpy,
      maxParallelDials: 3
    })
    await connectionManager.start()

    // Inject data into the AddressBook
    await localComponents.peerStore.merge(remoteComponents.peerId, {
      multiaddrs: peerMultiaddrs
    })

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
    connectionManager = new DefaultConnectionManager(localComponents, {
      maxParallelDials: 2
    })
    await connectionManager.start()

    // Inject data into the AddressBook
    await localComponents.peerStore.merge(remoteComponents.peerId, {
      multiaddrs: addrs
    })

    sinon.stub(localTM, 'dial').callsFake(async (_, options) => {
      const deferredDial = pDefer<Connection>()
      const onAbort = (): void => {
        options.signal.removeEventListener('abort', onAbort)
        deferredDial.reject(new AbortError())
      }
      options.signal.addEventListener('abort', onAbort)
      return deferredDial.promise
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
    await localComponents.peerStore.merge(remoteComponents.peerId, {
      multiaddrs: addrs
    })

    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    const transactionManagerDialStub = sinon.stub(localTM, 'dial')
    transactionManagerDialStub.callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), remoteComponents.peerId)))

    // Perform dial
    await connectionManager.openConnection(remoteComponents.peerId)

    expect(transactionManagerDialStub).to.have.property('callCount', 3)
  })

  it('should dial only the multiaddr that is passed', async () => {
    const addrs = [
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${remoteComponents.peerId.toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8002/ws/p2p/${remoteComponents.peerId.toString()}`)
    ]

    // Inject data into the AddressBook
    await localComponents.peerStore.merge(remoteComponents.peerId, {
      multiaddrs: addrs
    })

    // different address not in the address book, same peer id
    const dialMultiaddr = multiaddr(`/ip4/0.0.0.0/tcp/8003/ws/p2p/${remoteComponents.peerId.toString()}`)

    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    const transactionManagerDialStub = sinon.stub(localTM, 'dial')
    transactionManagerDialStub.callsFake(async (ma) => mockConnection(mockMultiaddrConnection(mockDuplex(), remoteComponents.peerId)))

    // Perform dial
    await connectionManager.openConnection(dialMultiaddr)

    expect(transactionManagerDialStub).to.have.property('callCount', 1)
    expect(transactionManagerDialStub.getCall(0).args[0].toString()).to.equal(dialMultiaddr.toString())
  })

  it('should throw if dialling an empty array is attempted', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    // Perform dial
    await expect(connectionManager.openConnection([])).to.eventually.rejected
      .with.property('code', 'ERR_NO_VALID_ADDRESSES')
  })

  it('should throw if dialling multiaddrs with mismatched peer ids', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

    // Perform dial
    await expect(connectionManager.openConnection([
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(await createPeerId()).toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${(await createPeerId()).toString()}`)
    ])).to.eventually.rejected
      .with.property('code', 'ERR_INVALID_PARAMETERS')
  })

  it('should throw if dialling multiaddrs with inconsistent peer ids', async () => {
    connectionManager = new DefaultConnectionManager(localComponents)
    await connectionManager.start()

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
  })
})

describe('libp2p.dialer (direct, WebSockets)', () => {
  let libp2p: Libp2p<{ identify: unknown }>
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

  it('should run identify automatically after connecting', async () => {
    libp2p = await createLibp2p({
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
      ],
      services: {
        identify: identifyService()
      },
      connectionGater: mockConnectionGater()
    })

    if (libp2p.services.identify == null) {
      throw new Error('Identify service missing')
    }

    const identifySpy = sinon.spy(libp2p.services.identify as DefaultIdentifyService, 'identify')
    const peerStorePatchSpy = sinon.spy(libp2p.peerStore, 'patch')
    const connectionPromise = pEvent(libp2p, 'connection:open')

    await libp2p.start()

    const connection = await libp2p.dial(relayMultiaddr)
    expect(connection).to.exist()

    // Wait for connection event to be emitted
    await connectionPromise

    expect(identifySpy.callCount).to.equal(1)
    await identifySpy.firstCall.returnValue

    expect(peerStorePatchSpy.callCount).to.equal(1)

    await libp2p.stop()
  })

  it('should be able to use hangup to close connections', async () => {
    libp2p = await createLibp2p({
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
      ],
      connectionGater: mockConnectionGater()
    })

    await libp2p.start()

    const connection = await libp2p.dial(relayMultiaddr)
    expect(connection).to.exist()
    expect(connection.stat.timeline.close).to.not.exist()

    await libp2p.hangUp(connection.remotePeer)
    expect(connection.stat.timeline.close).to.exist()

    await libp2p.stop()
  })

  it('should be able to use hangup when no connection exists', async () => {
    libp2p = await createLibp2p({
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
      ],
      connectionGater: mockConnectionGater()
    })

    await libp2p.hangUp(relayMultiaddr)
  })

  it('should fail to dial self', async () => {
    libp2p = await createLibp2p({
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
      ],
      connectionGater: mockConnectionGater()
    })

    await libp2p.start()

    await expect(libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/1234/ws/p2p/${peerId.toString()}`)))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_DIALED_SELF)
  })
})
