/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { Providers } from '../src/providers.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createPeerIds } from './utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import delay from 'delay'

describe('Providers', () => {
  let peers: PeerId[]
  let providers: Providers

  before(async function () {
    this.timeout(10 * 1000)
    peers = await createPeerIds(3)
  })

  afterEach(async () => {
    await providers?.stop()
  })

  it('simple add and get of providers', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore()
    })

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)
    const ids = new Set(provs.map((peerId) => peerId.toString()))
    expect(ids.has(peers[0].toString())).to.be.eql(true)
  })

  it('duplicate add of provider is deduped', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore()
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
    expect(ids.has(peers[0].toString())).to.be.eql(true)
  })

  it('more providers than space in the lru cache', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore()
    }, {
      cacheSize: 10
    })

    const hashes = await Promise.all([...new Array(100)].map(async (i: number) => {
      return await sha256.digest(uint8ArrayFromString(`hello ${i}`))
    }))

    const cids = hashes.map((h) => CID.createV0(h))

    await Promise.all(cids.map(async cid => { await providers.addProvider(cid, peers[0]) }))
    const provs = await Promise.all(cids.map(async cid => await providers.getProviders(cid)))

    expect(provs).to.have.length(100)
    for (const p of provs) {
      expect(p[0].toString()).to.be.equal(peers[0].toString())
    }
  })

  it('expires', async () => {
    providers = new Providers({
      datastore: new MemoryDatastore()
    }, {
      cleanupInterval: 100,
      provideValidity: 200
    })
    await providers.start()

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
    await providers.stop()
  })
})
