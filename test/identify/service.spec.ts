/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { multiaddr } from '@multiformats/multiaddr'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import Peers from '../fixtures/peers.js'
import { createLibp2pNode } from '../../src/libp2p.js'
import { createBaseOptions } from '../utils/base-options.browser.js'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import pWaitFor from 'p-wait-for'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Libp2pNode } from '../../src/libp2p.js'
import { pEvent } from 'p-event'
import { AGENT_VERSION } from '../../src/identify/consts.js'

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
    expect(identityServiceIdentifySpy.callCount).to.equal(2, 'should identify on inbound and outbound')

    // TODO assert identify called

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
    expect(identityServiceIdentifySpy.callCount).to.equal(2, 'should identify on inbound and outbound')

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

    // Cause supported protocols to change
    await libp2p.handle('/echo/2.0.0', () => {})

    // Wait for push to complete
    await pWaitFor(() => identityServicePushSpy.callCount === 1)
    await identityServicePushSpy.firstCall.returnValue

    // Cause supported protocols to change back
    await libp2p.unhandle('/echo/2.0.0')

    // Wait for push to complete a second time
    await pWaitFor(() => identityServicePushSpy.callCount === 2)
    await identityServicePushSpy.secondCall.returnValue

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

  it('should append UserAgent information to default AGENT_VERSION', async () => {
    // Stub environment version for testing dynamic AGENT_VERSION
    sinon.stub(process, 'version').value('vTEST')

    if (typeof globalThis.navigator !== 'undefined') {
      sinon.stub(navigator, 'userAgent').value('vTEST')
    }

    libp2p = await createLibp2pNode(createBaseOptions({
      peerId
    }))

    await libp2p.start()

    if (libp2p.identifyService == null) {
      throw new Error('Identity service was not configured')
    }

    const storedAgentVersion = await libp2p.peerStore.metadataBook.getValue(peerId, 'AgentVersion')

    expect(AGENT_VERSION + ' UserAgent=vTEST').to.equal(uint8ArrayToString(storedAgentVersion ?? new Uint8Array()))
  })

  it('should store host data and protocol version into metadataBook', async () => {
    const agentVersion = 'js-project/1.0.0'

    libp2p = await createLibp2pNode(createBaseOptions({
      peerId,
      identify: {
        host: {
          agentVersion
        }
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

    await libp2p.peerStore.addressBook.add(libp2p.peerId, [multiaddr('/ip4/180.0.0.1/tcp/15001/ws')])

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
