import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import createMortice from 'mortice'
import { CID } from 'multiformats/cid'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { Providers } from '../src/providers.js'
import { Reprovider } from '../src/reprovider.js'
import { createPeerId, createPeerIds } from './utils/create-peer-id.js'
import type { ContentRouting } from '../src/content-routing/index.js'
import type { ComponentLogger, PeerId } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Datastore } from 'interface-datastore'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedReproviderComponents {
  peerId: PeerId
  datastore: Datastore
  logger: ComponentLogger
  addressManager: StubbedInstance<AddressManager>
}

describe('reprovider', () => {
  let reprovider: Reprovider
  let providers: Providers
  let components: StubbedReproviderComponents
  let contentRouting: StubbedInstance<ContentRouting>
  let peers: PeerId[]

  beforeEach(async () => {
    peers = await createPeerIds(3)
    const peerId = await createPeerId()

    components = {
      peerId,
      datastore: new MemoryDatastore(),
      logger: defaultLogger(),
      addressManager: stubInterface()
    }

    contentRouting = stubInterface()
    contentRouting.provide.resolves([])

    const lock = createMortice()
    const logPrefix = 'libp2p'
    const datastorePrefix = '/dht'
    const metricsPrefix = ''

    providers = new Providers(components, {
      logPrefix,
      datastorePrefix,
      lock
    })

    reprovider = new Reprovider(components, {
      logPrefix,
      datastorePrefix,
      metricsPrefix,
      lock,
      contentRouting,
      threshold: 100,
      validity: 200,
      interval: 100,
      operationMetrics: {}
    })

    await start(reprovider)
  })

  afterEach(async () => {
    await stop(reprovider)
  })

  it('should reprovide', async () => {
    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await providers.addProvider(cid, components.peerId)

    expect(contentRouting.provide).to.have.property('callCount', 0)

    // wait for reprovide to occur
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    expect(contentRouting.provide).to.have.property('callCount', 1)
  })

  it('should cancel reprovide', async () => {
    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await providers.addProvider(cid, components.peerId)

    expect(contentRouting.provide).to.have.property('callCount', 0)

    // wait for reprovide to occur
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    expect(contentRouting.provide).to.have.property('callCount', 1)

    await providers.removeProvider(cid, components.peerId)

    // wait for another reprovide
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    // should not have provided again
    expect(contentRouting.provide).to.have.property('callCount', 1)
  })

  it('should remove expired provider records', async () => {
    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)

    expect(provs).to.have.length(2)
    expect(provs[0].toString()).to.be.equal(peers[0].toString())
    expect(provs[1].toString()).to.be.deep.equal(peers[1].toString())

    await delay(400)

    const provsAfter = await providers.getProviders(cid)
    expect(provsAfter).to.have.length(0)
  })
})
