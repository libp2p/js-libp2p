/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { LevelDatastore } from 'datastore-level'
import path from 'path'
import os from 'os'
import { Providers } from '../src/providers.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createValues } from './utils/create-values.js'
import { createPeerIds } from './utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import delay from 'delay'
import { Components } from '@libp2p/interfaces/components'

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
    providers = new Providers()
    providers.init(new Components({
      datastore: new MemoryDatastore()
    }))

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
    providers = new Providers()
    providers.init(new Components({
      datastore: new MemoryDatastore()
    }))

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
      cacheSize: 10
    })
    providers.init(new Components({
      datastore: new MemoryDatastore()
    }))

    const hashes = await Promise.all([...new Array(100)].map((i: number) => {
      return sha256.digest(uint8ArrayFromString(`hello ${i}`))
    }))

    const cids = hashes.map((h) => CID.createV0(h))

    await Promise.all(cids.map(async cid => await providers.addProvider(cid, peers[0])))
    const provs = await Promise.all(cids.map(async cid => await providers.getProviders(cid)))

    expect(provs).to.have.length(100)
    for (const p of provs) {
      expect(p[0].toString()).to.be.equal(peers[0].toString())
    }
  })

  it('expires', async () => {
    providers = new Providers({
      cleanupInterval: 100,
      provideValidity: 200
    })
    providers.init(new Components({
      datastore: new MemoryDatastore()
    }))
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

  // slooow so only run when you need to
  it.skip('many', async function () {
    const p = path.join(
      os.tmpdir(), (Math.random() * 100).toString()
    )
    const store = new LevelDatastore(p)
    await store.open()
    providers = new Providers({
      cacheSize: 10
    })
    providers.init(new Components({
      datastore: store
    }))

    console.log('starting') // eslint-disable-line no-console
    const [createdValues, createdPeers] = await Promise.all([
      createValues(100),
      createPeerIds(600)
    ])

    console.log('got values and peers') // eslint-disable-line no-console
    const total = Date.now()

    for (const v of createdValues) {
      for (const p of createdPeers) {
        await providers.addProvider(v.cid, p)
      }
    }

    console.log('addProvider %s peers %s cids in %sms', createdPeers.length, createdValues.length, Date.now() - total) // eslint-disable-line no-console
    console.log('starting profile with %s peers and %s cids', createdPeers.length, createdValues.length) // eslint-disable-line no-console

    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      for (const v of createdValues) {
        await providers.getProviders(v.cid)
        console.log('query %sms', (Date.now() - start)) // eslint-disable-line no-console
      }
    }

    await store.close()
  })
})
