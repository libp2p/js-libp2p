import { defaultLogger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { CID } from 'multiformats/cid'
import { Providers } from '../src/providers.js'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import type { PeerAndKey } from './utils/create-peer-id.js'

describe('providers', () => {
  let peers: PeerAndKey[]
  let providers: Providers

  before(async function () {
    peers = await createPeerIdsWithPrivateKey(3)
  })

  it('should add and get providers', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht'
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0].peerId),
      providers.addProvider(cid, peers[1].peerId)
    ])

    const provs = await providers.getProviders(cid)
    const ids = new Set(provs.map((peerId) => peerId.toString()))
    expect(ids.has(peers[0].peerId.toString())).to.equal(true)
  })

  it('should deduplicate multiple adds of same provider', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht'
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0].peerId),
      providers.addProvider(cid, peers[0].peerId),
      providers.addProvider(cid, peers[1].peerId),
      providers.addProvider(cid, peers[1].peerId),
      providers.addProvider(cid, peers[1].peerId)
    ])

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(2)
    const ids = new Set(provs.map((peerId) => peerId.toString()))
    expect(ids.has(peers[0].peerId.toString())).to.equal(true)
  })

  it('should deduplicate CIDs by multihash', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht'
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    const cidA = CID.createV1(5, cid.multihash)
    const cidB = CID.createV1(6, cid.multihash)

    await Promise.all([
      providers.addProvider(cidA, peers[0].peerId),
      providers.addProvider(cidB, peers[1].peerId),
      providers.addProvider(cid, peers[2].peerId)
    ])

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(3)
    expect(provs).to.include.deep.members([
      peers[0].peerId,
      peers[1].peerId,
      peers[2].peerId
    ])
  })

  it('should cancel reprovide of a CID we are not providing', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht'
    })

    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')
    const peerId = peerIdFromString('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await expect(providers.removeProvider(cid, peerId)).to.not.be.rejected()
  })
})
