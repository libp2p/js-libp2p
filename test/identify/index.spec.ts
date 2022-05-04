/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Multiaddr } from '@multiformats/multiaddr'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { codes } from '../../src/errors.js'
import { IdentifyService, Message } from '../../src/identify/index.js'
import Peers from '../fixtures/peers.js'
import { createLibp2pNode } from '../../src/libp2p.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { createBaseOptions } from '../utils/base-options.browser.js'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { MemoryDatastore } from 'datastore-core/memory'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import * as lp from 'it-length-prefixed'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-compliance-tests/mocks'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { Components } from '@libp2p/interfaces/components'
import { PeerRecordUpdater } from '../../src/peer-record-updater.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { CustomEvent } from '@libp2p/interfaces/events'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Libp2pNode } from '../../src/libp2p.js'
import { pEvent } from 'p-event'
import { start, stop } from '@libp2p/interfaces/startable'

const listenMaddrs = [new Multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

const defaultInit = {
  protocolPrefix: 'ipfs',
  host: {
    agentVersion: 'v1.0.0'
  }
}

const protocols = [MULTICODEC_IDENTIFY, MULTICODEC_IDENTIFY_PUSH]

async function createComponents (index: number) {
  const peerId = await createFromJSON(Peers[index])

  const components = new Components({
    peerId,
    datastore: new MemoryDatastore(),
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    connectionGater: mockConnectionGater(),
    peerStore: new PersistentPeerStore(),
    connectionManager: new DefaultConnectionManager({
      minConnections: 50,
      maxConnections: 1000,
      autoDialInterval: 1000
    })
  })
  components.setAddressManager(new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  }))

  const transportManager = new DefaultTransportManager(components)
  components.setTransportManager(transportManager)

  await components.getPeerStore().protoBook.set(peerId, protocols)

  return components
}

describe('Identify', () => {
  let localComponents: Components
  let remoteComponents: Components

  let localPeerRecordUpdater: PeerRecordUpdater
  let remotePeerRecordUpdater: PeerRecordUpdater

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

    localPeerRecordUpdater = new PeerRecordUpdater(localComponents)
    remotePeerRecordUpdater = new PeerRecordUpdater(remoteComponents)

    await Promise.all([
      start(localComponents),
      start(remoteComponents)
    ])
  })

  afterEach(async () => {
    sinon.restore()

    await Promise.all([
      stop(localComponents),
      stop(remoteComponents)
    ])
  })

  it('should be able to identify another peer', async () => {
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localAddressBookConsumePeerRecordSpy = sinon.spy(localComponents.getPeerStore().addressBook, 'consumePeerRecord')
    const localProtoBookSetSpy = sinon.spy(localComponents.getPeerStore().protoBook, 'set')

    // Make sure the remote peer has a peer record to share during identify
    await remotePeerRecordUpdater.update()

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localAddressBookConsumePeerRecordSpy.callCount).to.equal(1)
    expect(localProtoBookSetSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const addresses = await localComponents.getPeerStore().addressBook.get(remoteComponents.getPeerId())
    expect(addresses).to.exist()

    expect(addresses).have.lengthOf(listenMaddrs.length)
    expect(addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(addresses.map((a) => a.isCertified)[0]).to.be.true()
  })

  // LEGACY
  it('should be able to identify another peer with no certified peer records support', async () => {
    const agentVersion = 'js-libp2p/5.0.0'
    const localIdentify = new IdentifyService(localComponents, {
      protocolPrefix: 'ipfs',
      host: {
        agentVersion: agentVersion
      }
    })
    await start(localIdentify)
    const remoteIdentify = new IdentifyService(remoteComponents, {
      protocolPrefix: 'ipfs',
      host: {
        agentVersion: agentVersion
      }
    })
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    sinon.stub(localComponents.getPeerStore().addressBook, 'consumePeerRecord').throws()

    const localProtoBookSetSpy = sinon.spy(localComponents.getPeerStore().protoBook, 'set')

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localProtoBookSetSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const addresses = await localComponents.getPeerStore().addressBook.get(remoteComponents.getPeerId())
    expect(addresses).to.exist()

    expect(addresses).have.lengthOf(listenMaddrs.length)
    expect(addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(addresses.map((a) => a.isCertified)[0]).to.be.false()
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // send an invalid message
    await remoteComponents.getRegistrar().unhandle(MULTICODEC_IDENTIFY)
    await remoteComponents.getRegistrar().handle(MULTICODEC_IDENTIFY, (data) => {
      void Promise.resolve().then(async () => {
        const { connection, stream } = data
        const signedPeerRecord = await remoteComponents.getPeerStore().addressBook.getRawEnvelope(remoteComponents.getPeerId())

        const message = Message.Identify.encode({
          protocolVersion: '123',
          agentVersion: '123',
          // send bad public key
          publicKey: localComponents.getPeerId().publicKey ?? new Uint8Array(0),
          listenAddrs: [],
          signedPeerRecord,
          observedAddr: connection.remoteAddr.bytes,
          protocols: []
        })

        await pipe(
          [message],
          lp.encode(),
          stream,
          drain
        )
      })
    })

    // Run identify
    await expect(localIdentify.identify(localToRemote))
      .to.eventually.be.rejected()
      .and.to.have.property('code', codes.ERR_INVALID_PEER)
  })

  it('should store own host data and protocol version into metadataBook on start', async () => {
    const agentVersion = 'js-project/1.0.0'
    const localIdentify = new IdentifyService(localComponents, {
      protocolPrefix: 'ipfs',
      host: {
        agentVersion
      }
    })

    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'AgentVersion'))
      .to.eventually.be.undefined()
    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'ProtocolVersion'))
      .to.eventually.be.undefined()

    await start(localIdentify)

    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'AgentVersion'))
      .to.eventually.deep.equal(uint8ArrayFromString(agentVersion))
    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'ProtocolVersion'))
      .to.eventually.be.ok()

    await stop(localIdentify)
  })

  describe('push', () => {
    it('should be able to push identify updates to another peer', async () => {
      const localIdentify = new IdentifyService(localComponents, defaultInit)
      const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

      await start(localIdentify)
      await start(remoteIdentify)

      const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

      // ensure connections are registered by connection manager
      localComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
        detail: localToRemote
      }))
      remoteComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
        detail: remoteToLocal
      }))

      // identify both ways
      await localIdentify.identify(localToRemote)
      await remoteIdentify.identify(remoteToLocal)

      const updatedProtocol = '/special-new-protocol/1.0.0'
      const updatedAddress = new Multiaddr('/ip4/127.0.0.1/tcp/48322')

      // should have protocols but not our new one
      const identifiedProtocols = await remoteComponents.getPeerStore().protoBook.get(localComponents.getPeerId())
      expect(identifiedProtocols).to.not.be.empty()
      expect(identifiedProtocols).to.not.include(updatedProtocol)

      // should have addresses but not our new one
      const identifiedAddresses = await remoteComponents.getPeerStore().addressBook.get(localComponents.getPeerId())
      expect(identifiedAddresses).to.not.be.empty()
      expect(identifiedAddresses.map(a => a.multiaddr.toString())).to.not.include(updatedAddress.toString())

      // update local data - change event will trigger push
      await localComponents.getPeerStore().protoBook.add(localComponents.getPeerId(), [updatedProtocol])
      await localComponents.getPeerStore().addressBook.add(localComponents.getPeerId(), [updatedAddress])

      // needed to update the peer record and send our supported addresses
      const addressManager = localComponents.getAddressManager()
      addressManager.getAddresses = () => {
        return [updatedAddress]
      }

      // ensure sequence number of peer record we are about to create is different
      await delay(1000)

      // make sure we have a peer record to send
      await localPeerRecordUpdater.update()

      // wait for the remote peer store to notice the changes
      const eventPromise = pEvent(remoteComponents.getPeerStore(), 'change:multiaddrs')

      // push updated peer record to connections
      await localIdentify.pushToPeerStore()

      await eventPromise

      // should have new protocol
      const updatedProtocols = await remoteComponents.getPeerStore().protoBook.get(localComponents.getPeerId())
      expect(updatedProtocols).to.not.be.empty()
      expect(updatedProtocols).to.include(updatedProtocol)

      // should have new address
      const updatedAddresses = await remoteComponents.getPeerStore().addressBook.get(localComponents.getPeerId())
      expect(updatedAddresses.map(a => {
        return {
          multiaddr: a.multiaddr.toString(),
          isCertified: a.isCertified
        }
      })).to.deep.equal([{
        multiaddr: updatedAddress.toString(),
        isCertified: true
      }])

      await stop(localIdentify)
      await stop(remoteIdentify)
    })

    // LEGACY
    it('should be able to push identify updates to another peer with no certified peer records support', async () => {
      const localIdentify = new IdentifyService(localComponents, defaultInit)
      const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

      await start(localIdentify)
      await start(remoteIdentify)

      const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

      // ensure connections are registered by connection manager
      localComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
        detail: localToRemote
      }))
      remoteComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
        detail: remoteToLocal
      }))

      // identify both ways
      await localIdentify.identify(localToRemote)
      await remoteIdentify.identify(remoteToLocal)

      const updatedProtocol = '/special-new-protocol/1.0.0'
      const updatedAddress = new Multiaddr('/ip4/127.0.0.1/tcp/48322')

      // should have protocols but not our new one
      const identifiedProtocols = await remoteComponents.getPeerStore().protoBook.get(localComponents.getPeerId())
      expect(identifiedProtocols).to.not.be.empty()
      expect(identifiedProtocols).to.not.include(updatedProtocol)

      // should have addresses but not our new one
      const identifiedAddresses = await remoteComponents.getPeerStore().addressBook.get(localComponents.getPeerId())
      expect(identifiedAddresses).to.not.be.empty()
      expect(identifiedAddresses.map(a => a.multiaddr.toString())).to.not.include(updatedAddress.toString())

      // update local data - change event will trigger push
      await localComponents.getPeerStore().protoBook.add(localComponents.getPeerId(), [updatedProtocol])
      await localComponents.getPeerStore().addressBook.add(localComponents.getPeerId(), [updatedAddress])

      // needed to send our supported addresses
      const addressManager = localComponents.getAddressManager()
      addressManager.getAddresses = () => {
        return [updatedAddress]
      }

      // wait until remote peer store notices protocol list update
      const waitForUpdate = pEvent(remoteComponents.getPeerStore(), 'change:protocols')

      await localIdentify.pushToPeerStore()

      await waitForUpdate

      // should have new protocol
      const updatedProtocols = await remoteComponents.getPeerStore().protoBook.get(localComponents.getPeerId())
      expect(updatedProtocols).to.not.be.empty()
      expect(updatedProtocols).to.include(updatedProtocol)

      // should have new address
      const updatedAddresses = await remoteComponents.getPeerStore().addressBook.get(localComponents.getPeerId())
      expect(updatedAddresses.map(a => {
        return {
          multiaddr: a.multiaddr.toString(),
          isCertified: a.isCertified
        }
      })).to.deep.equal([{
        multiaddr: updatedAddress.toString(),
        isCertified: false
      }])

      await stop(localIdentify)
      await stop(remoteIdentify)
    })
  })

  describe('libp2p.dialer.identifyService', () => {
    let peerId: PeerId
    let libp2p: Libp2pNode
    let remoteLibp2p: Libp2pNode
    const remoteAddr = MULTIADDRS_WEBSOCKETS[0]

    before(async () => {
      peerId = await createFromJSON(Peers[0])
    })

    afterEach(async () => {
      sinon.restore()

      if (libp2p != null) {
        await libp2p.stop()
      }
    })

    after(async () => {
      if (remoteLibp2p != null) {
        await remoteLibp2p.stop()
      }
    })

    it('should run identify automatically after connecting', async () => {
      libp2p = await createLibp2pNode(createBaseOptions({
        peerId
      }))

      await libp2p.start()

      if (libp2p.identifyService == null) {
        throw new Error('Identity service was not configured')
      }

      const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')
      const peerStoreSpyConsumeRecord = sinon.spy(libp2p.peerStore.addressBook, 'consumePeerRecord')
      const peerStoreSpyAdd = sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()

      // Wait for peer store to be updated
      // Dialer._createDialTarget (add), Identify (consume)
      await pWaitFor(() => peerStoreSpyConsumeRecord.callCount === 1 && peerStoreSpyAdd.callCount === 1)
      expect(identityServiceIdentifySpy.callCount).to.equal(1)

      // The connection should have no open streams
      await pWaitFor(() => connection.streams.length === 0)
      await connection.close()
    })

    it('should store remote agent and protocol versions in metadataBook after connecting', async () => {
      libp2p = await createLibp2pNode(createBaseOptions({
        peerId
      }))

      await libp2p.start()

      if (libp2p.identifyService == null) {
        throw new Error('Identity service was not configured')
      }

      const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')
      const peerStoreSpyConsumeRecord = sinon.spy(libp2p.peerStore.addressBook, 'consumePeerRecord')
      const peerStoreSpyAdd = sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()

      // Wait for peer store to be updated
      // Dialer._createDialTarget (add), Identify (consume)
      await pWaitFor(() => peerStoreSpyConsumeRecord.callCount === 1 && peerStoreSpyAdd.callCount === 1)
      expect(identityServiceIdentifySpy.callCount).to.equal(1)

      // The connection should have no open streams
      await pWaitFor(() => connection.streams.length === 0)
      await connection.close()

      const remotePeer = peerIdFromString(remoteAddr.getPeerId() ?? '')

      const storedAgentVersion = await libp2p.peerStore.metadataBook.getValue(remotePeer, 'AgentVersion')
      const storedProtocolVersion = await libp2p.peerStore.metadataBook.getValue(remotePeer, 'ProtocolVersion')

      expect(storedAgentVersion).to.exist()
      expect(storedProtocolVersion).to.exist()
    })

    it('should push protocol updates to an already connected peer', async () => {
      libp2p = await createLibp2pNode(createBaseOptions({
        peerId
      }))

      await libp2p.start()

      if (libp2p.identifyService == null) {
        throw new Error('Identity service was not configured')
      }

      const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')
      const identityServicePushSpy = sinon.spy(libp2p.identifyService, 'push')
      const connectionPromise = pEvent(libp2p.connectionManager, 'peer:connect')
      const connection = await libp2p.dial(remoteAddr)

      expect(connection).to.exist()
      // Wait for connection event to be emitted
      await connectionPromise

      // Wait for identify to finish
      await identityServiceIdentifySpy.firstCall.returnValue
      sinon.stub(libp2p, 'isStarted').returns(true)

      await libp2p.handle('/echo/2.0.0', () => {})
      await libp2p.unhandle('/echo/2.0.0')

      // the protocol change event listener in the identity service is async
      await pWaitFor(() => identityServicePushSpy.callCount === 2)

      // Verify the remote peer is notified of both changes
      expect(identityServicePushSpy.callCount).to.equal(2)

      for (const call of identityServicePushSpy.getCalls()) {
        const [connections] = call.args
        expect(connections.length).to.equal(1)
        expect(connections[0].remotePeer.toString()).to.equal(remoteAddr.getPeerId())
        await call.returnValue
      }

      // Verify the streams close
      await pWaitFor(() => connection.streams.length === 0)
    })

    it('should store host data and protocol version into metadataBook', async () => {
      const agentVersion = 'js-project/1.0.0'

      libp2p = await createLibp2pNode(createBaseOptions({
        peerId,
        host: {
          agentVersion
        }
      }))

      await libp2p.start()

      if (libp2p.identifyService == null) {
        throw new Error('Identity service was not configured')
      }

      const storedAgentVersion = await libp2p.peerStore.metadataBook.getValue(peerId, 'AgentVersion')
      const storedProtocolVersion = await libp2p.peerStore.metadataBook.getValue(peerId, 'ProtocolVersion')

      expect(agentVersion).to.equal(uint8ArrayToString(storedAgentVersion ?? new Uint8Array()))
      expect(storedProtocolVersion).to.exist()
    })

    it('should push multiaddr updates to an already connected peer', async () => {
      libp2p = await createLibp2pNode(createBaseOptions({
        peerId
      }))

      await libp2p.start()

      if (libp2p.identifyService == null) {
        throw new Error('Identity service was not configured')
      }

      const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')
      const identityServicePushSpy = sinon.spy(libp2p.identifyService, 'push')
      const connectionPromise = pEvent(libp2p.connectionManager, 'peer:connect')
      const connection = await libp2p.dial(remoteAddr)

      expect(connection).to.exist()
      // Wait for connection event to be emitted
      await connectionPromise

      // Wait for identify to finish
      await identityServiceIdentifySpy.firstCall.returnValue
      sinon.stub(libp2p, 'isStarted').returns(true)

      await libp2p.peerStore.addressBook.add(libp2p.peerId, [new Multiaddr('/ip4/180.0.0.1/tcp/15001/ws')])

      // the protocol change event listener in the identity service is async
      await pWaitFor(() => identityServicePushSpy.callCount === 1)

      // Verify the remote peer is notified of change
      expect(identityServicePushSpy.callCount).to.equal(1)
      for (const call of identityServicePushSpy.getCalls()) {
        const [connections] = call.args
        expect(connections.length).to.equal(1)
        expect(connections[0].remotePeer.toString()).to.equal(remoteAddr.getPeerId())
        await call.returnValue
      }

      // Verify the streams close
      await pWaitFor(() => connection.streams.length === 0)
    })
  })
})
