/* eslint-env mocha */

import { mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { EventEmitter } from '@libp2p/interfaces/events'
import { start, stop } from '@libp2p/interfaces/startable'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { pipe } from 'it-pipe'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { fetchService, type FetchServiceInit } from '../../src/fetch/index.js'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import type { TransportManager } from '@libp2p/interface-transport'

const defaultInit: FetchServiceInit = {
  protocolPrefix: 'ipfs',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  timeout: 1000
}

async function createComponents (index: number): Promise<Components> {
  const peerId = await createEd25519PeerId()

  const events = new EventEmitter()
  const components = defaultComponents({
    peerId,
    registrar: mockRegistrar(),
    upgrader: mockUpgrader({ events }),
    datastore: new MemoryDatastore(),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: stubInterface<ConnectionGater>(),
    events
  })
  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    inboundUpgradeTimeout: 1000
  })

  return components
}

describe('fetch', () => {
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

  it('should be able to fetch from another peer', async () => {
    const key = 'key'
    const value = Uint8Array.from([0, 1, 2, 3, 4])
    const localFetch = fetchService(defaultInit)(localComponents)
    const remoteFetch = fetchService(defaultInit)(remoteComponents)

    remoteFetch.registerLookupFunction(key, async (identifier) => {
      expect(identifier).to.equal(key)

      return value
    })

    await start(localFetch)
    await start(remoteFetch)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    // Run fetch
    const result = await localFetch.fetch(remoteComponents.peerId, key)

    expect(result).to.equalBytes(value)
  })

  it('should time out fetching from another peer when waiting for the record', async () => {
    const key = 'key'
    const localFetch = fetchService(defaultInit)(localComponents)
    const remoteFetch = fetchService(defaultInit)(remoteComponents)

    await start(localFetch)
    await start(remoteFetch)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    // replace existing handler with a really slow one
    await remoteComponents.registrar.unhandle(remoteFetch.protocol)
    await remoteComponents.registrar.handle(remoteFetch.protocol, ({ stream }) => {
      void pipe(
        stream,
        async function * (source) {
          for await (const chunk of source) {
            // longer than the timeout
            await delay(1000)

            yield chunk
          }
        },
        stream
      )
    })

    const newStreamSpy = sinon.spy(localToRemote, 'newStream')

    // 10 ms timeout
    const signal = AbortSignal.timeout(10)

    // Run fetch, should time out
    await expect(localFetch.fetch(remoteComponents.peerId, key, {
      signal
    }))
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')

    // should have closed stream
    expect(newStreamSpy).to.have.property('callCount', 1)
    const stream = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('stat.timeline.close')
  })
})
