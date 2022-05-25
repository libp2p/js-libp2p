/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Multiaddr } from '@multiformats/multiaddr'
import { IdentifyService } from '../../src/identify/index.js'
import Peers from '../fixtures/peers.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { MemoryDatastore } from 'datastore-core/memory'
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

describe('identify (push)', () => {
  let localComponents: Components
  let remoteComponents: Components

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
    await remoteComponents.getRegistrar().unhandle(MULTICODEC_IDENTIFY_PUSH)
    await remoteComponents.getRegistrar().handle(MULTICODEC_IDENTIFY_PUSH, ({ stream }) => {
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
    const { stream } = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('timeline.close')

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
