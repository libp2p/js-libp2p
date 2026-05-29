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
import { convertBuffer } from '../src/utils.ts'
import { createPeerIdWithPrivateKey, createPeerIdsWithPrivateKey } from './utils/create-peer-id.ts'
import type { PeerAndKey } from './utils/create-peer-id.ts'
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

    await delay(450)

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

  it('should reprovide in Kademlia key order', async function () {
    this.timeout(5000)

    // five well-known IPFS CIDs — their Kademlia keys will be in some order
    // that is unlikely to match the insertion order below
    const cids = [
      CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb'),
      CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'),
      CID.parse('QmRgutAxd8t7oGkSm4wmeuByG6M51wcTso6cubDdQtuEfL'),
      CID.parse('QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'),
      CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
    ]

    // compute expected Kademlia key order — use multihash bytes as canonical
    // identity since parseProviderKey always reconstructs CIDs as CIDv1/raw
    const kadKeys = await Promise.all(cids.map(cid => convertBuffer(cid.multihash.bytes)))
    const expectedMultihashes = cids
      .map((cid, i) => ({ multihash: cid.multihash.bytes, kadKey: kadKeys[i] }))
      .sort((a, b) => {
        for (let i = 0; i < a.kadKey.length; i++) {
          if (a.kadKey[i] !== b.kadKey[i]) {
            return a.kadKey[i] - b.kadKey[i]
          }
        }
        return 0
      })
      .map(({ multihash }) => multihash)

    // insert CIDs in REVERSE expected order to prove sorting overrides insertion order
    for (const { multihash } of [...expectedMultihashes].reverse().map((m, i) => ({ multihash: m, i }))) {
      const cid = cids.find(c => c.multihash.bytes === multihash) ??
        cids.find(c => c.multihash.bytes.every((b, j) => b === multihash[j]))
      if (cid != null) {
        await providers.addProvider(cid, components.peerId)
      }
    }

    // recreate reprovider with concurrency=1 so provides are strictly sequential
    // sortBatchSize >= cids.length so all CIDs are sorted in one batch
    reprovider = new Reprovider(components, {
      logPrefix: 'libp2p',
      datastorePrefix: '/dht',
      metricsPrefix: '',
      contentRouting,
      threshold: 100,
      validity: 200,
      interval: 200,
      concurrency: 1,
      sortBatchSize: cids.length,
      operationMetrics: {}
    })

    const provisionMultihashes: Uint8Array[] = []

    // resolve when all CIDs have been provided
    let resolveWhenDone!: () => void
    const whenAllDone = new Promise<void>(resolve => { resolveWhenDone = resolve })
    let provided = 0

    contentRouting.provide.callsFake(async function * (cid: CID) {
      provisionMultihashes.push(cid.multihash.bytes)
      provided++
      if (provided === cids.length) {
        resolveWhenDone()
      }
      yield * []
    })

    await start(reprovider)
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')

    // wait for the queue to finish processing all enqueued reprovides
    await whenAllDone

    // verify CIDs were provided in Kademlia key order by checking each
    // adjacent pair maintains non-decreasing Kademlia key order
    expect(provisionMultihashes).to.have.lengthOf(cids.length)

    for (let i = 1; i < provisionMultihashes.length; i++) {
      const prevKey = await convertBuffer(provisionMultihashes[i - 1])
      const currKey = await convertBuffer(provisionMultihashes[i])

      let comparison = 0
      for (let j = 0; j < prevKey.length; j++) {
        if (prevKey[j] !== currKey[j]) {
          comparison = prevKey[j] - currKey[j]
          break
        }
      }

      expect(comparison).to.be.lessThanOrEqual(0,
        `CID at position ${i - 1} should have a smaller or equal Kademlia key than position ${i}`
      )
    }
  })

  it('should sort within each batch when CID count exceeds sortBatchSize', async function () {
    this.timeout(5000)

    const cids = [
      CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb'),
      CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'),
      CID.parse('QmRgutAxd8t7oGkSm4wmeuByG6M51wcTso6cubDdQtuEfL'),
      CID.parse('QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'),
      CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
    ]

    for (const cid of cids) {
      await providers.addProvider(cid, components.peerId)
    }

    // sortBatchSize=2: CIDs are sorted in batches of 2. Ordering within each
    // batch is verified; cross-batch ordering is intentionally not guaranteed.
    reprovider = new Reprovider(components, {
      logPrefix: 'libp2p',
      datastorePrefix: '/dht',
      metricsPrefix: '',
      contentRouting,
      threshold: 100,
      validity: 200,
      interval: 200,
      concurrency: 1,
      sortBatchSize: 2,
      operationMetrics: {}
    })

    const provisionMultihashes: Uint8Array[] = []

    let resolveWhenDone!: () => void
    const whenAllDone = new Promise<void>(resolve => { resolveWhenDone = resolve })
    let provided = 0

    contentRouting.provide.callsFake(async function * (cid: CID) {
      provisionMultihashes.push(cid.multihash.bytes)
      provided++
      if (provided === cids.length) {
        resolveWhenDone()
      }
      yield * []
    })

    await start(reprovider)
    await pEvent(reprovider, 'reprovide:start')
    await pEvent(reprovider, 'reprovide:end')
    await whenAllDone

    expect(provisionMultihashes).to.have.lengthOf(cids.length)

    // verify ordering within each batch of sortBatchSize
    const batchSize = 2
    for (let b = 0; b < provisionMultihashes.length; b += batchSize) {
      const batchEnd = Math.min(b + batchSize, provisionMultihashes.length)
      for (let i = b + 1; i < batchEnd; i++) {
        const prevKey = await convertBuffer(provisionMultihashes[i - 1])
        const currKey = await convertBuffer(provisionMultihashes[i])

        let comparison = 0
        for (let j = 0; j < prevKey.length; j++) {
          if (prevKey[j] !== currKey[j]) {
            comparison = prevKey[j] - currKey[j]
            break
          }
        }

        expect(comparison).to.be.lessThanOrEqual(0,
          `within batch: CID at position ${i - 1} should have a smaller or equal Kademlia key than position ${i}`
        )
      }
    }
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
