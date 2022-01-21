'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const { EventEmitter } = require('events')
const PeerId = require('peer-id')
const duplexPair = require('it-pair/duplex')
const { Multiaddr } = require('multiaddr')
const pWaitFor = require('p-wait-for')
const { toString: unit8ArrayToString } = require('uint8arrays/to-string')
const { codes: Errors } = require('../../src/errors')
const IdentifyService = require('../../src/identify')
const multicodecs = IdentifyService.multicodecs
const Peers = require('../fixtures/peers')
const Libp2p = require('../../src')
const Envelope = require('../../src/record/envelope')
const PeerStore = require('../../src/peer-store')
const baseOptions = require('../utils/base-options.browser')
const { updateSelfPeerRecord } = require('../../src/record/utils')
const pkg = require('../../package.json')
const AddressManager = require('../../src/address-manager')
const { MemoryDatastore } = require('datastore-core/memory')
const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const remoteAddr = MULTIADDRS_WEBSOCKETS[0]
const listenMaddrs = [new Multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

describe('Identify', () => {
  let localPeer, localPeerStore, localAddressManager
  let remotePeer, remotePeerStore, remoteAddressManager
  const protocols = [multicodecs.IDENTIFY, multicodecs.IDENTIFY_PUSH]

  before(async () => {
    [localPeer, remotePeer] = (await Promise.all([
      PeerId.createFromJSON(Peers[0]),
      PeerId.createFromJSON(Peers[1])
    ]))

    localPeerStore = new PeerStore({
      peerId: localPeer,
      datastore: new MemoryDatastore()
    })
    await localPeerStore.protoBook.set(localPeer, protocols)

    remotePeerStore = new PeerStore({
      peerId: remotePeer,
      datastore: new MemoryDatastore()
    })
    await remotePeerStore.protoBook.set(remotePeer, protocols)

    localAddressManager = new AddressManager(localPeer)
    remoteAddressManager = new AddressManager(remotePeer)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to identify another peer', async () => {
    const localIdentify = new IdentifyService({
      libp2p: {
        peerId: localPeer,
        connectionManager: new EventEmitter(),
        peerStore: localPeerStore,
        multiaddrs: listenMaddrs,
        isStarted: () => true,
        _options: { host: {} },
        _config: { protocolPrefix: 'ipfs' }
      }
    })
    const remoteIdentify = new IdentifyService({
      libp2p: {
        peerId: remotePeer,
        connectionManager: new EventEmitter(),
        peerStore: remotePeerStore,
        multiaddrs: listenMaddrs,
        isStarted: () => true,
        _options: { host: {} },
        _config: { protocolPrefix: 'ipfs' }
      }
    })

    const observedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {}, remotePeer }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    sinon.spy(localIdentify.peerStore.addressBook, 'consumePeerRecord')
    sinon.spy(localIdentify.peerStore.protoBook, 'set')

    // Transport Manager creates signed peer record
    await updateSelfPeerRecord(remoteIdentify._libp2p)

    // Run identify
    await Promise.all([
      localIdentify.identify(localConnectionMock),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    expect(localIdentify.peerStore.addressBook.consumePeerRecord.callCount).to.equal(1)
    expect(localIdentify.peerStore.protoBook.set.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const addresses = await localIdentify.peerStore.addressBook.get(remotePeer)
    expect(addresses).to.exist()
    expect(addresses).have.lengthOf(listenMaddrs.length)
    expect(addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(addresses.map((a) => a.isCertified)[0]).to.eql(true)
  })

  // LEGACY
  it('should be able to identify another peer with no certified peer records support', async () => {
    const agentVersion = `js-libp2p/${pkg.version}`
    const localIdentify = new IdentifyService({
      libp2p: {
        peerId: localPeer,
        connectionManager: new EventEmitter(),
        addressManager: localAddressManager,
        peerStore: localPeerStore,
        multiaddrs: listenMaddrs,
        isStarted: () => true,
        _options: { host: { agentVersion } },
        _config: { protocolPrefix: 'ipfs' }
      }
    })

    const remoteIdentify = new IdentifyService({
      libp2p: {
        peerId: remotePeer,
        connectionManager: new EventEmitter(),
        addressManager: remoteAddressManager,
        peerStore: remotePeerStore,
        multiaddrs: listenMaddrs,
        isStarted: () => true,
        _options: { host: { agentVersion } },
        _config: { protocolPrefix: 'ipfs' }
      }
    })

    const observedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {}, remotePeer }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })
    sinon.stub(Envelope, 'openAndCertify').throws()

    sinon.spy(localIdentify.peerStore.addressBook, 'set')
    sinon.spy(localIdentify.peerStore.protoBook, 'set')
    sinon.spy(localIdentify.peerStore.metadataBook, 'setValue')

    // Run identify
    await Promise.all([
      localIdentify.identify(localConnectionMock),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    expect(localIdentify.peerStore.addressBook.set.callCount).to.equal(1)
    expect(localIdentify.peerStore.protoBook.set.callCount).to.equal(1)

    const metadataArgs = localIdentify.peerStore.metadataBook.setValue.firstCall.args
    expect(metadataArgs[0].id.bytes).to.equal(remotePeer.bytes)
    expect(metadataArgs[1]).to.equal('AgentVersion')
    expect(unit8ArrayToString(metadataArgs[2])).to.equal(agentVersion)

    // Validate the remote peer gets updated in the peer store
    const call = localIdentify.peerStore.addressBook.set.firstCall
    expect(call.args[0].id.bytes).to.equal(remotePeer.bytes)
    expect(call.args[1]).to.exist()
    expect(call.args[1]).have.lengthOf(listenMaddrs.length)
    expect(call.args[1][0].equals(listenMaddrs[0]))
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new IdentifyService({
      libp2p: {
        peerId: localPeer,
        connectionManager: new EventEmitter(),
        peerStore: localPeerStore,
        multiaddrs: [],
        _options: { host: {} },
        _config: { protocolPrefix: 'ipfs' }
      }
    })
    const remoteIdentify = new IdentifyService({
      libp2p: {
        peerId: remotePeer,
        connectionManager: new EventEmitter(),
        peerStore: remotePeerStore,
        multiaddrs: [],
        _options: { host: {} },
        _config: { protocolPrefix: 'ipfs' }
      }
    })

    const observedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {}, remotePeer: localPeer }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    // Run identify
    const identifyPromise = Promise.all([
      localIdentify.identify(localConnectionMock, localPeer),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    await expect(identifyPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('code', Errors.ERR_INVALID_PEER)
  })

  it('should store host data and protocol version into metadataBook', async () => {
    const agentVersion = 'js-project/1.0.0'
    const peerStore = new PeerStore({
      peerId: localPeer,
      datastore: new MemoryDatastore()
    })

    sinon.spy(peerStore.metadataBook, 'setValue')

    const service = new IdentifyService({ // eslint-disable-line no-new
      libp2p: {
        peerId: localPeer,
        connectionManager: new EventEmitter(),
        peerStore,
        multiaddrs: listenMaddrs,
        _options: {
          host: {
            agentVersion
          }
        },
        _config: { protocolPrefix: 'ipfs' }
      },
      protocols
    })

    await service.start()

    expect(peerStore.metadataBook.setValue.callCount).to.eql(2)

    const storedAgentVersion = await peerStore.metadataBook.getValue(localPeer, 'AgentVersion')
    const storedProtocolVersion = await peerStore.metadataBook.getValue(localPeer, 'ProtocolVersion')

    expect(agentVersion).to.eql(unit8ArrayToString(storedAgentVersion))
    expect(storedProtocolVersion).to.exist()

    await service.stop()
  })

  describe('push', () => {
    it('should be able to push identify updates to another peer', async () => {
      const storedProtocols = [multicodecs.IDENTIFY, multicodecs.IDENTIFY_PUSH, '/echo/1.0.0'].sort()
      const connectionManager = new EventEmitter()
      connectionManager.getConnection = () => { }

      const localPeerStore = new PeerStore({
        peerId: localPeer,
        datastore: new MemoryDatastore()
      })
      await localPeerStore.protoBook.set(localPeer, storedProtocols)

      const localIdentify = new IdentifyService({
        libp2p: {
          peerId: localPeer,
          connectionManager: new EventEmitter(),
          peerStore: localPeerStore,
          multiaddrs: listenMaddrs,
          isStarted: () => true,
          _options: { host: {} },
          _config: { protocolPrefix: 'ipfs' }
        }
      })

      const remotePeerStore = new PeerStore({
        peerId: remotePeer,
        datastore: new MemoryDatastore()
      })
      await remotePeerStore.protoBook.set(remotePeer, storedProtocols)

      const remoteIdentify = new IdentifyService({
        libp2p: {
          peerId: remotePeer,
          connectionManager,
          peerStore: remotePeerStore,
          multiaddrs: [],
          isStarted: () => true,
          _options: { host: {} },
          _config: { protocolPrefix: 'ipfs' }
        }
      })

      // Setup peer protocols and multiaddrs
      const localProtocols = new Set(storedProtocols)
      const localConnectionMock = { newStream: () => { } }
      const remoteConnectionMock = { remotePeer: localPeer }

      const [local, remote] = duplexPair()
      sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY_PUSH })

      sinon.spy(remoteIdentify.peerStore.addressBook, 'consumePeerRecord')
      sinon.spy(remoteIdentify.peerStore.protoBook, 'set')

      // Transport Manager creates signed peer record
      await updateSelfPeerRecord(localIdentify._libp2p)
      await updateSelfPeerRecord(remoteIdentify._libp2p)

      // Run identify
      await Promise.all([
        localIdentify.push([localConnectionMock]),
        remoteIdentify.handleMessage({
          connection: remoteConnectionMock,
          stream: remote,
          protocol: multicodecs.IDENTIFY_PUSH
        })
      ])

      expect(remoteIdentify.peerStore.addressBook.consumePeerRecord.callCount).to.equal(2)
      expect(remoteIdentify.peerStore.protoBook.set.callCount).to.equal(1)

      const addresses = await localIdentify.peerStore.addressBook.get(localPeer)
      expect(addresses).to.exist()
      expect(addresses).have.lengthOf(listenMaddrs.length)
      expect(addresses.map((a) => a.multiaddr)).to.eql(listenMaddrs)

      const [peerId2, protocols] = remoteIdentify.peerStore.protoBook.set.firstCall.args
      expect(peerId2.bytes).to.eql(localPeer.bytes)
      expect(protocols).to.eql(Array.from(localProtocols))
    })

    // LEGACY
    it('should be able to push identify updates to another peer with no certified peer records support', async () => {
      const storedProtocols = [multicodecs.IDENTIFY, multicodecs.IDENTIFY_PUSH, '/echo/1.0.0'].sort()
      const connectionManager = new EventEmitter()
      connectionManager.getConnection = () => { }

      const localPeerStore = new PeerStore({
        peerId: localPeer,
        datastore: new MemoryDatastore()
      })
      await localPeerStore.protoBook.set(localPeer, storedProtocols)

      const localIdentify = new IdentifyService({
        libp2p: {
          peerId: localPeer,
          connectionManager: new EventEmitter(),
          peerStore: localPeerStore,
          multiaddrs: listenMaddrs,
          isStarted: () => true,
          _options: { host: {} },
          _config: { protocolPrefix: 'ipfs' }
        }
      })

      const remotePeerStore = new PeerStore({
        peerId: remotePeer,
        datastore: new MemoryDatastore()
      })
      await remotePeerStore.protoBook.set(remotePeer, storedProtocols)

      const remoteIdentify = new IdentifyService({
        libp2p: {
          peerId: remotePeer,
          connectionManager,
          peerStore: remotePeerStore,
          multiaddrs: [],
          _options: { host: {} },
          _config: { protocolPrefix: 'ipfs' },
          isStarted: () => true
        }
      })

      // Setup peer protocols and multiaddrs
      const localProtocols = new Set(storedProtocols)
      const localConnectionMock = { newStream: () => {} }
      const remoteConnectionMock = { remotePeer: localPeer }

      const [local, remote] = duplexPair()
      sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY_PUSH })
      sinon.stub(Envelope, 'openAndCertify').throws()

      sinon.spy(remoteIdentify.peerStore.addressBook, 'set')
      sinon.spy(remoteIdentify.peerStore.protoBook, 'set')

      // Run identify
      await Promise.all([
        localIdentify.push([localConnectionMock]),
        remoteIdentify.handleMessage({
          connection: remoteConnectionMock,
          stream: remote,
          protocol: multicodecs.IDENTIFY_PUSH
        })
      ])

      expect(remoteIdentify.peerStore.addressBook.set.callCount).to.equal(1)
      expect(remoteIdentify.peerStore.protoBook.set.callCount).to.equal(1)

      const [peerId, multiaddrs] = remoteIdentify.peerStore.addressBook.set.firstCall.args
      expect(peerId.bytes).to.eql(localPeer.bytes)
      expect(multiaddrs).to.eql(listenMaddrs)

      const [peerId2, protocols] = remoteIdentify.peerStore.protoBook.set.firstCall.args
      expect(peerId2.bytes).to.eql(localPeer.bytes)
      expect(protocols).to.eql(Array.from(localProtocols))
    })
  })

  describe('libp2p.dialer.identifyService', () => {
    let peerId
    let libp2p
    let remoteLibp2p

    before(async () => {
      peerId = await PeerId.createFromJSON(Peers[0])
    })

    afterEach(async () => {
      sinon.restore()
      libp2p && await libp2p.stop()
      libp2p = null
    })

    after(async () => {
      remoteLibp2p && await remoteLibp2p.stop()
    })

    it('should run identify automatically after connecting', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerId
      })

      await libp2p.start()

      sinon.spy(libp2p.identifyService, 'identify')
      const peerStoreSpyConsumeRecord = sinon.spy(libp2p.peerStore.addressBook, 'consumePeerRecord')
      const peerStoreSpyAdd = sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()

      // Wait for peer store to be updated
      // Dialer._createDialTarget (add), Identify (consume)
      await pWaitFor(() => peerStoreSpyConsumeRecord.callCount === 1 && peerStoreSpyAdd.callCount === 1)
      expect(libp2p.identifyService.identify.callCount).to.equal(1)

      // The connection should have no open streams
      await pWaitFor(() => connection.streams.length === 0)
      await connection.close()
    })

    it('should store remote agent and protocol versions in metadataBook after connecting', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerId
      })

      await libp2p.start()

      sinon.spy(libp2p.identifyService, 'identify')
      const peerStoreSpyConsumeRecord = sinon.spy(libp2p.peerStore.addressBook, 'consumePeerRecord')
      const peerStoreSpyAdd = sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()

      // Wait for peer store to be updated
      // Dialer._createDialTarget (add), Identify (consume)
      await pWaitFor(() => peerStoreSpyConsumeRecord.callCount === 1 && peerStoreSpyAdd.callCount === 1)
      expect(libp2p.identifyService.identify.callCount).to.equal(1)

      // The connection should have no open streams
      await pWaitFor(() => connection.streams.length === 0)
      await connection.close()

      const remotePeer = PeerId.createFromB58String(remoteAddr.getPeerId())

      const storedAgentVersion = libp2p.peerStore.metadataBook.getValue(remotePeer, 'AgentVersion')
      const storedProtocolVersion = libp2p.peerStore.metadataBook.getValue(remotePeer, 'ProtocolVersion')

      expect(storedAgentVersion).to.exist()
      expect(storedProtocolVersion).to.exist()
    })

    it('should push protocol updates to an already connected peer', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerId
      })

      await libp2p.start()

      sinon.spy(libp2p.identifyService, 'identify')
      sinon.spy(libp2p.identifyService, 'push')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()

      // Wait for identify to finish
      await libp2p.identifyService.identify.firstCall.returnValue
      sinon.stub(libp2p, 'isStarted').returns(true)

      await libp2p.handle('/echo/2.0.0', () => {})
      await libp2p.unhandle('/echo/2.0.0')

      // the protocol change event listener in the identity service is async
      await pWaitFor(() => libp2p.identifyService.push.callCount === 2)

      // Verify the remote peer is notified of both changes
      expect(libp2p.identifyService.push.callCount).to.equal(2)

      for (const call of libp2p.identifyService.push.getCalls()) {
        const [connections] = call.args
        expect(connections.length).to.equal(1)
        expect(connections[0].remotePeer.toB58String()).to.equal(remoteAddr.getPeerId())
        const results = await call.returnValue
        expect(results.length).to.equal(1)
      }

      // Verify the streams close
      await pWaitFor(() => connection.streams.length === 0)
    })

    it('should store host data and protocol version into metadataBook', async () => {
      const agentVersion = 'js-project/1.0.0'

      libp2p = new Libp2p({
        ...baseOptions,
        peerId,
        host: {
          agentVersion
        }
      })
      await libp2p.start()

      const storedAgentVersion = await libp2p.peerStore.metadataBook.getValue(localPeer, 'AgentVersion')
      const storedProtocolVersion = await libp2p.peerStore.metadataBook.getValue(localPeer, 'ProtocolVersion')

      expect(agentVersion).to.eql(unit8ArrayToString(storedAgentVersion))
      expect(storedProtocolVersion).to.exist()
    })

    it('should push multiaddr updates to an already connected peer', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerId
      })

      await libp2p.start()

      sinon.spy(libp2p.identifyService, 'identify')
      sinon.spy(libp2p.identifyService, 'push')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()

      // Wait for identify to finish
      await libp2p.identifyService.identify.firstCall.returnValue
      sinon.stub(libp2p, 'isStarted').returns(true)

      await libp2p.peerStore.addressBook.add(libp2p.peerId, [new Multiaddr('/ip4/180.0.0.1/tcp/15001/ws')])

      // the protocol change event listener in the identity service is async
      await pWaitFor(() => libp2p.identifyService.push.callCount === 1)

      // Verify the remote peer is notified of change
      expect(libp2p.identifyService.push.callCount).to.equal(1)
      for (const call of libp2p.identifyService.push.getCalls()) {
        const [connections] = call.args
        expect(connections.length).to.equal(1)
        expect(connections[0].remotePeer.toB58String()).to.equal(remoteAddr.getPeerId())
        const results = await call.returnValue
        expect(results.length).to.equal(1)
      }

      // Verify the streams close
      await pWaitFor(() => connection.streams.length === 0)
    })
  })
})
