/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import createMortice from 'mortice'
import { CID } from 'multiformats/cid'
import { Providers } from '../src/providers.js'
import { createPeerIds } from './utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interface'

describe('providers', () => {
  let peers: PeerId[]
  let providers: Providers

  before(async function () {
    peers = await createPeerIds(3)
  })

  it('should add and get providers', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht',
      lock: createMortice()
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)
    const ids = new Set(provs.map((peerId) => peerId.toString()))
    expect(ids.has(peers[0].toString())).to.equal(true)
  })

  it('should deduplicate multiple adds of same provider', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht',
      lock: createMortice()
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1]),
      providers.addProvider(cid, peers[1]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(2)
    const ids = new Set(provs.map((peerId) => peerId.toString()))
    expect(ids.has(peers[0].toString())).to.equal(true)
  })

  it('should deduplicate CIDs by multihash', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht',
      lock: createMortice()
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    const cidA = CID.createV1(5, cid.multihash)
    const cidB = CID.createV1(6, cid.multihash)

    await Promise.all([
      providers.addProvider(cidA, peers[0]),
      providers.addProvider(cidB, peers[1]),
      providers.addProvider(cid, peers[2])
    ])

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(3)
    expect(provs).to.include.deep.members([
      peers[0],
      peers[1],
      peers[2]
    ])
  })

  it('should cancel reprovide of a CID we are not providing', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht',
      lock: createMortice()
    })

    const cid = CID.parse('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')
    const peerId = peerIdFromString('QmZ8eiDPqQqWR17EPxiwCDgrKPVhCHLcyn6xSCNpFAdAZb')

    await expect(providers.removeProvider(cid, peerId)).to.not.be.rejected()
  })
})
