/* eslint-env mocha */

import { EventEmitter } from '@libp2p/interface/events'
import { start, stop } from '@libp2p/interface/startable'
import { connectionPair, mockConnectionGater, mockRegistrar, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { type Components, defaultComponents } from 'libp2p/components'
import { DefaultConnectionManager } from 'libp2p/connection-manager'
import { stubInterface } from 'sinon-ts'
import { defaultInit, perfService } from '../src/index.js'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

export async function createComponents (): Promise<Components> {
  const peerId = await createEd25519PeerId()

  const events = new EventEmitter()

  const components = defaultComponents({
    peerId,
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    datastore: new MemoryDatastore(),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: mockConnectionGater(),
    events
  })

  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    autoDialInterval: 1000,
    inboundUpgradeTimeout: 1000
  })

  return components
}

describe('perf', () => {
  let localComponents: Components
  let remoteComponents: Components

  beforeEach(async () => {
    localComponents = await createComponents()
    remoteComponents = await createComponents()

    await Promise.all([
      start(localComponents),
      start(remoteComponents)
    ])
  })

  afterEach(async () => {
    await Promise.all([
      stop(localComponents),
      stop(remoteComponents)
    ])
  })

  it('should run perf', async () => {
    const client = perfService(defaultInit)(localComponents)
    const server = perfService(defaultInit)(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    // Run Perf
    await expect(client.perf(localToRemote, 1024n, 1024n)).to.eventually.be.fulfilled()
  })

  it('should output bandwidth', async () => {
    const client = perfService(defaultInit)(localComponents)
    const server = perfService(defaultInit)(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    let downloadBandwidth = 0
    let uploadBandwidth = 0

    for (let i = 0; i < 5; i++) {
      // Run Perf
      downloadBandwidth += await client.measureDownloadBandwidth(localToRemote, 10485760n)
      uploadBandwidth += await client.measureUploadBandwidth(localToRemote, 10485760n)
    }

    // eslint-disable-next-line no-console
    console.log('Upload bandwidth:', Math.floor(downloadBandwidth / 5), 'B/s')

    // eslint-disable-next-line no-console
    console.log('Download bandwidth:', Math.floor(uploadBandwidth / 5), 'B/s')
  })
})
