/* eslint-env mocha */

import { expect } from 'aegir/chai'
import Peers from '../fixtures/peers.js'
import { PerfService } from '../../src/perf/index.js'
import { mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { start, stop } from '@libp2p/interfaces/startable'
import { CustomEvent } from '@libp2p/interfaces/events'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { DefaultComponents } from '../../src/components.js'

async function createComponents (index: number): Promise<DefaultComponents> {
  const peerId = await createFromJSON(Peers[index])

  const components = new DefaultComponents({
    peerId,
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    datastore: new MemoryDatastore()
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
  let localComponents: DefaultComponents
  let remoteComponents: DefaultComponents

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

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
    const client = new PerfService(localComponents)
    const server = new PerfService(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.upgrader.dispatchEvent(new CustomEvent('connection', { detail: localToRemote }))
    remoteComponents.upgrader.dispatchEvent(new CustomEvent('connection', { detail: remoteToLocal }))

    // Run Perf
    await expect(client.startPerfOnStream(remoteComponents.peerId, 1n << 10n, 1n << 10n)).to.eventually.be.fulfilled()
  })

  it('local benchmark', async () => {
    const client = new PerfService(localComponents)
    const server = new PerfService(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.upgrader.dispatchEvent(new CustomEvent('connection', { detail: localToRemote }))
    remoteComponents.upgrader.dispatchEvent(new CustomEvent('connection', { detail: remoteToLocal }))

    // Run Perf
    const downloadBandwidth = await client.measureDownloadBandwidth(remoteComponents.peerId, 10n << 20n)
    // eslint-disable-next-line no-console
    console.log('Download bandwidth: ', downloadBandwidth >> 10, ' kiB/s')

    const uploadBandwidth = await client.measureDownloadBandwidth(remoteComponents.peerId, 10n << 20n)
    // eslint-disable-next-line no-console
    console.log('Upload bandwidth: ', uploadBandwidth >> 10, ' kiB/s')
  })
})
