/* eslint-env mocha */

import { EventEmitter } from '@libp2p/interface/events'
import { start, stop } from '@libp2p/interface/startable'
import { connectionPair, mockRegistrar, type MockNetworkComponents, mockConnectionManager } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { defaultInit, perfService, type PerfService } from '../src/index.js'
import type { Connection } from '@libp2p/interface/connection'

export async function createComponents (): Promise<MockNetworkComponents> {
  const components: any = {
    peerId: await createEd25519PeerId(),
    registrar: mockRegistrar(),
    events: new EventEmitter()
  }

  components.connectionManager = mockConnectionManager(components)

  return components as MockNetworkComponents
}

describe('perf', () => {
  let localComponents: MockNetworkComponents
  let remoteComponents: MockNetworkComponents

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

    const startTime = Date.now()

    // Run Perf
    await expect(client.measurePerformance(startTime, localToRemote, 1024n, 1024n)).to.eventually.be.fulfilled()
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
      downloadBandwidth += await measureDownloadBandwidth(localToRemote, 10485760n, client)
      uploadBandwidth += await measureUploadBandwidth(localToRemote, 10485760n, client)
    }

    // eslint-disable-next-line no-console
    console.log('Upload bandwidth:', Math.floor(downloadBandwidth / 5), 'B/s')

    // eslint-disable-next-line no-console
    console.log('Download bandwidth:', Math.floor(uploadBandwidth / 5), 'B/s')

    expect(downloadBandwidth).to.be.greaterThan(0)
    expect(uploadBandwidth).to.be.greaterThan(0)
  })

  // measureDownloadBandwidth returns the measured bandwidth in bytes per second B/s
  async function measureDownloadBandwidth (connection: Connection, size: bigint, client: PerfService): Promise<number> {
    const startTime = Date.now()
    const duration = await client.measurePerformance(startTime, connection, 0n, size)
    return Number((8000n * size) / BigInt(duration))
  }

  // measureUploadBandwidth returns the measured bandwidth in bytes per second B/s
  async function measureUploadBandwidth (connection: Connection, size: bigint, client: PerfService): Promise<number> {
    const startTime = Date.now()
    const duration = await client.measurePerformance(startTime, connection, size, 0n)
    return Number((8000n * size) / BigInt(duration))
  }
})
