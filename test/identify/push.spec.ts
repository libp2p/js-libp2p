/* eslint-env mocha */

import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { EventEmitter } from '@libp2p/interfaces/events'
import { start, stop } from '@libp2p/interfaces/startable'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultIdentifyService } from '../../src/identify/identify.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import type { IdentifyServiceInit } from '../../src/identify/index.js'
import type { TransportManager } from '@libp2p/interface-transport'

const listenMaddrs = [multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

const defaultInit: IdentifyServiceInit = {
  protocolPrefix: 'ipfs',
  agentVersion: 'v1.0.0',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxPushIncomingStreams: 1,
  maxPushOutgoingStreams: 1,
  timeout: 1000
}

const protocols = [MULTICODEC_IDENTIFY, MULTICODEC_IDENTIFY_PUSH]

async function createComponents (index: number): Promise<Components> {
  const peerId = await createEd25519PeerId()

  const events = new EventEmitter()
  const components = defaultComponents({
    peerId,
    datastore: new MemoryDatastore(),
    registrar: mockRegistrar(),
    upgrader: mockUpgrader({ events }),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: mockConnectionGater(),
    events
  })
  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    inboundUpgradeTimeout: 1000
  })
  components.addressManager = new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  })

  const transportManager = new DefaultTransportManager(components)
  components.transportManager = transportManager

  await components.peerStore.patch(peerId, {
    protocols
  })

  return components
}

describe('identify (push)', () => {
  let localComponents: Components
  let remoteComponents: Components

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

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

  it('should be able to push identify updates to another peer', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // ensure connections are registered by connection manager
    localComponents.events.safeDispatchEvent('connection:open', {
      detail: localToRemote
    })
    remoteComponents.events.safeDispatchEvent('connection:open', {
      detail: remoteToLocal
    })

    // identify both ways
    await localIdentify.identify(localToRemote)
    await remoteIdentify.identify(remoteToLocal)

    const updatedProtocol = '/special-new-protocol/1.0.0'
    const updatedAddress = multiaddr('/ip4/127.0.0.1/tcp/48322')

    const peer = await remoteComponents.peerStore.get(localComponents.peerId)
    // should have protocols but not our new one
    expect(peer.protocols).to.not.be.empty()
    expect(peer.protocols).to.not.include(updatedProtocol)

    // should have addresses but not our new one
    expect(peer.addresses).to.not.be.empty()
    expect(peer.addresses.map(a => a.multiaddr.toString())).to.not.include(updatedAddress.toString())

    // needed to update the peer record and send our supported addresses
    const addressManager = localComponents.addressManager
    addressManager.getAddresses = () => {
      return [updatedAddress]
    }

    // ensure sequence number of peer record we are about to create is different
    await delay(1000)

    // wait for the remote peer store to notice the changes
    const eventPromise = pEvent(remoteComponents.events, 'peer:update')

    // update local data - change event will trigger push
    await localComponents.registrar.handle(updatedProtocol, () => {})
    await localComponents.peerStore.merge(localComponents.peerId, {
      multiaddrs: [updatedAddress]
    })

    await eventPromise

    // should have new protocol
    const updatedPeer = await remoteComponents.peerStore.get(localComponents.peerId)
    expect(updatedPeer.protocols).to.not.be.empty()
    expect(updatedPeer.protocols).to.include(updatedProtocol)

    // should have new address
    expect(updatedPeer.addresses.map(a => {
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

  it('should time out during push identify', async () => {
    let streamEnded = false
    const localIdentify = new DefaultIdentifyService(localComponents, {
      ...defaultInit,
      timeout: 10
    })
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    // simulate connection between nodes
    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // replace existing handler with a really slow one
    await remoteComponents.registrar.unhandle(MULTICODEC_IDENTIFY_PUSH)
    await remoteComponents.registrar.handle(MULTICODEC_IDENTIFY_PUSH, ({ stream }) => {
      void pipe(
        stream,
        async function * (source) {
          // ignore the sent data
          await drain(source)

          // longer than the timeout
          await delay(1000)

          // the delay should have caused the local push to time out so this should
          // occur after the local push method invocation has completed
          streamEnded = true

          yield new Uint8Array()
        },
        stream
      )
    })

    // make sure we'll return the connection
    await localComponents.peerStore.patch(localToRemote.remotePeer, {
      protocols: [
        MULTICODEC_IDENTIFY_PUSH
      ]
    })
    localComponents.connectionManager.getConnections = sinon.stub().returns([localToRemote])

    const newStreamSpy = sinon.spy(localToRemote, 'newStream')

    // push updated peer record to remote
    await localIdentify.push()

    // should have closed stream
    expect(newStreamSpy).to.have.property('callCount', 1)
    const stream = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('stat.timeline.close')

    // method should have returned before the remote handler completes as we timed
    // out so we ignore the return value
    expect(streamEnded).to.be.false()
  })
})
