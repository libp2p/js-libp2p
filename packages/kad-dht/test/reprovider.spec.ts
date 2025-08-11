import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { CID } from 'multiformats/cid'
import { pEvent } from 'p-event'
import { stubInterface } from 'sinon-ts'
import { Providers } from '../src/providers.js'
import { Reprovider } from '../src/reprovider.js'
import { createPeerIdWithPrivateKey, createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import type { PeerAndKey } from './utils/create-peer-id.js'
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
  let peers: PeerAndKey[]

  beforeEach(async () => {
    peers = await createPeerIdsWithPrivateKey(3)
    const peer = await createPeerIdWithPrivateKey()

    components = {
      peerId: peer.peerId,
      datastore: new MemoryDatastore(),
      logger: defaultLogger(),
      addressManager: stubInterface()
    }

    contentRouting = stubInterface()
    contentRouting.provide.resolves([])

    const logPrefix = 'libp2p'
    const datastorePrefix = '/dht'
    const metricsPrefix = ''

    providers = new Providers(components, {
      logPrefix,
      datastorePrefix
    })

    reprovider = new Reprovider(components, {
      logPrefix,
      datastorePrefix,
      metricsPrefix,
      contentRouting,
      threshold: 100,
      validity: 200,
      interval: 200,
      operationMetrics: {}
    })
  })

  afterEach(async () => {
    await stop(reprovider)
  })

  it('should reprovide', async () => {
    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await start(reprovider)

    await providers.addProvider(cid, components.peerId)

    expect(contentRouting.provide).to.have.property('callCount', 0)

    // wait for reprovide to occur
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    expect(contentRouting.provide).to.have.property('callCount', 1)
  })

  it('should cancel reprovide', async () => {
    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await start(reprovider)

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

    await start(reprovider)

    await Promise.all([
      providers.addProvider(cid, peers[0].peerId),
      providers.addProvider(cid, peers[1].peerId)
    ])

    const provs = await providers.getProviders(cid)

    expect(provs).to.have.length(2)
    expect(provs[0].toString()).to.be.equal(peers[0].peerId.toString())
    expect(provs[1].toString()).to.be.deep.equal(peers[1].peerId.toString())

    await delay(400)

    const provsAfter = await providers.getProviders(cid)
    expect(provsAfter).to.have.length(0)
  })

  it('should delete expired records from other peers but preserve own expired records', async () => {
    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await start(reprovider)

    // Add provider records - one from us, one from another peer
    await providers.addProvider(cid, components.peerId)
    await providers.addProvider(cid, peers[0].peerId)

    const provsBefore = await providers.getProviders(cid)
    expect(provsBefore).to.have.length(2)

    // Wait for records to expire (validity is 200ms)
    await delay(250)

    // Trigger reprovide cycle to process expired records
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    const provsAfter = await providers.getProviders(cid)

    // Only our own record should remain, other peer's expired record should be deleted
    expect(provsAfter).to.have.length(1)
    expect(provsAfter[0].toString()).to.equal(components.peerId.toString())
  })

  describe('shouldReprovide', () => {
    it('should return false for non-self providers', () => {
      const expires = Date.now() + 50
      const result = (reprovider as any).shouldReprovide(false, expires)
      expect(result).to.be.false()
    })

    it('should return true when within reprovide threshold before expiration', () => {
      const expires = Date.now() + 50
      const result = (reprovider as any).shouldReprovide(true, expires)
      expect(result).to.be.true()
    })

    it('should return true when within reprovide threshold after expiration', () => {
      const expires = Date.now() - 50
      const result = (reprovider as any).shouldReprovide(true, expires)
      expect(result).to.be.true()
    })

    it('should return false when outside reprovide threshold before expiration', () => {
      const expires = Date.now() + 150
      const result = (reprovider as any).shouldReprovide(true, expires)
      expect(result).to.be.false()
    })

    it('should return true when outside reprovide threshold after expiration', () => {
      const expires = Date.now() - 150
      const result = (reprovider as any).shouldReprovide(true, expires)
      expect(result).to.be.true()
    })
  })
})
