/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { multiaddr } from '@multiformats/multiaddr'
import { IdentifyService, IdentifyServiceInit } from '../../src/identify/index.js'
import Peers from '../fixtures/peers.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { MemoryDatastore } from 'datastore-core/memory'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { PeerRecordUpdater } from '../../src/peer-record-updater.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import { CustomEvent } from '@libp2p/interfaces/events'
import delay from 'delay'
import { pEvent } from 'p-event'
import { start, stop } from '@libp2p/interfaces/startable'
import { stubInterface } from 'sinon-ts'
import type { Dialer } from '@libp2p/interface-connection-manager'
import { DefaultComponents } from '../../src/components.js'

const listenMaddrs = [multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

const defaultInit: IdentifyServiceInit = {
  protocolPrefix: 'ipfs',
  host: {
    agentVersion: 'v1.0.0'
  },
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxPushIncomingStreams: 1,
  maxPushOutgoingStreams: 1,
  timeout: 1000
}

const protocols = [MULTICODEC_IDENTIFY, MULTICODEC_IDENTIFY_PUSH]

async function createComponents (index: number): Promise<DefaultComponents> {
  const peerId = await createFromJSON(Peers[index])

  const components = new DefaultComponents({
    peerId,
    datastore: new MemoryDatastore(),
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    connectionGater: mockConnectionGater(),
    dialer: stubInterface<Dialer>()
  })
  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    autoDialInterval: 1000,
    inboundUpgradeTimeout: 1000
  })
  components.addressManager = new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  })

  const transportManager = new DefaultTransportManager(components)
  components.transportManager = transportManager

  await components.peerStore.protoBook.set(peerId, protocols)

  return components
}

describe('identify (push)', () => {
  let localComponents: DefaultComponents
  let remoteComponents: DefaultComponents

  let localPeerRecordUpdater: PeerRecordUpdater

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

    localPeerRecordUpdater = new PeerRecordUpdater(localComponents)

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
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // ensure connections are registered by connection manager
    localComponents.upgrader.dispatchEvent(new CustomEvent('connection', {
      detail: localToRemote
    }))
    remoteComponents.upgrader.dispatchEvent(new CustomEvent('connection', {
      detail: remoteToLocal
    }))

    // identify both ways
    await localIdentify.identify(localToRemote)
    await remoteIdentify.identify(remoteToLocal)

    const updatedProtocol = '/special-new-protocol/1.0.0'
    const updatedAddress = multiaddr('/ip4/127.0.0.1/tcp/48322')

    // should have protocols but not our new one
    const identifiedProtocols = await remoteComponents.peerStore.protoBook.get(localComponents.peerId)
    expect(identifiedProtocols).to.not.be.empty()
    expect(identifiedProtocols).to.not.include(updatedProtocol)

    // should have addresses but not our new one
    const identifiedAddresses = await remoteComponents.peerStore.addressBook.get(localComponents.peerId)
    expect(identifiedAddresses).to.not.be.empty()
    expect(identifiedAddresses.map(a => a.multiaddr.toString())).to.not.include(updatedAddress.toString())

    // update local data - change event will trigger push
    await localComponents.peerStore.protoBook.add(localComponents.peerId, [updatedProtocol])
    await localComponents.peerStore.addressBook.add(localComponents.peerId, [updatedAddress])

    // needed to update the peer record and send our supported addresses
    const addressManager = localComponents.addressManager
    addressManager.getAddresses = () => {
      return [updatedAddress]
    }

    // ensure sequence number of peer record we are about to create is different
    await delay(1000)

    // make sure we have a peer record to send
    localPeerRecordUpdater.update()

    // wait for the remote peer store to notice the changes
    const eventPromise = pEvent(remoteComponents.peerStore, 'change:multiaddrs')

    // push updated peer record to connections
    await localIdentify.pushToPeerStore()

    await eventPromise

    // should have new protocol
    const updatedProtocols = await remoteComponents.peerStore.protoBook.get(localComponents.peerId)
    expect(updatedProtocols).to.not.be.empty()
    expect(updatedProtocols).to.include(updatedProtocol)

    // should have new address
    const updatedAddresses = await remoteComponents.peerStore.addressBook.get(localComponents.peerId)
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

  it('should time out during push identify', async () => {
    let streamEnded = false
    const localIdentify = new IdentifyService(localComponents, {
      ...defaultInit,
      timeout: 10
    })
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

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

    const newStreamSpy = sinon.spy(localToRemote, 'newStream')

    // push updated peer record to remote
    await localIdentify.push([localToRemote])

    // should have closed stream
    expect(newStreamSpy).to.have.property('callCount', 1)
    const stream = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('stat.timeline.close')

    // method should have returned before the remote handler completes as we timed
    // out so we ignore the return value
    expect(streamEnded).to.be.false()
  })

  // LEGACY
  it('should be able to push identify updates to another peer with no certified peer records support', async () => {
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // ensure connections are registered by connection manager
    localComponents.upgrader.dispatchEvent(new CustomEvent('connection', {
      detail: localToRemote
    }))
    remoteComponents.upgrader.dispatchEvent(new CustomEvent('connection', {
      detail: remoteToLocal
    }))

    // identify both ways
    await localIdentify.identify(localToRemote)
    await remoteIdentify.identify(remoteToLocal)

    const updatedProtocol = '/special-new-protocol/1.0.0'
    const updatedAddress = multiaddr('/ip4/127.0.0.1/tcp/48322')

    // should have protocols but not our new one
    const identifiedProtocols = await remoteComponents.peerStore.protoBook.get(localComponents.peerId)
    expect(identifiedProtocols).to.not.be.empty()
    expect(identifiedProtocols).to.not.include(updatedProtocol)

    // should have addresses but not our new one
    const identifiedAddresses = await remoteComponents.peerStore.addressBook.get(localComponents.peerId)
    expect(identifiedAddresses).to.not.be.empty()
    expect(identifiedAddresses.map(a => a.multiaddr.toString())).to.not.include(updatedAddress.toString())

    // update local data - change event will trigger push
    await localComponents.peerStore.protoBook.add(localComponents.peerId, [updatedProtocol])
    await localComponents.peerStore.addressBook.add(localComponents.peerId, [updatedAddress])

    // needed to send our supported addresses
    const addressManager = localComponents.addressManager
    addressManager.getAddresses = () => {
      return [updatedAddress]
    }

    // wait until remote peer store notices protocol list update
    const waitForUpdate = pEvent(remoteComponents.peerStore, 'change:protocols')

    await localIdentify.pushToPeerStore()

    await waitForUpdate

    // should have new protocol
    const updatedProtocols = await remoteComponents.peerStore.protoBook.get(localComponents.peerId)
    expect(updatedProtocols).to.not.be.empty()
    expect(updatedProtocols).to.include(updatedProtocol)

    // should have new address
    const updatedAddresses = await remoteComponents.peerStore.addressBook.get(localComponents.peerId)
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
