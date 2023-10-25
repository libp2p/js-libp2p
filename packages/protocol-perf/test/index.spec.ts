/* eslint-env mocha */

import { EventEmitter } from '@libp2p/interface/events'
import { start, stop } from '@libp2p/interface/startable'
import { connectionPair, mockRegistrar, type MockNetworkComponents, mockConnectionManager } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { defaultInit, perfService } from '../src/index.js'

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
})
