/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { MemoryDatastore } = require('datastore-core/memory')
const { CID } = require('multiformats/cid')
const { sha256 } = require('multiformats/hashes/sha2')
const { LevelDatastore } = require('datastore-level')
const path = require('path')
const os = require('os')
const { Providers } = require('../src/providers')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const createPeerId = require('./utils/create-peer-id')
const createValues = require('./utils/create-values')

describe('Providers', () => {
  let peers
  let providers

  before(async function () {
    this.timeout(10 * 1000)
    peers = await createPeerId(3)
  })

  afterEach(() => {
    providers && providers.stop()
  })

  it('simple add and get of providers', async () => {
    providers = new Providers(new MemoryDatastore(), peers[2])

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)
    const ids = new Set(provs.map((peerId) => peerId.toB58String()))
    expect(ids.has(peers[0].toB58String())).to.be.eql(true)
  })

  it('duplicate add of provider is deduped', async () => {
    providers = new Providers(new MemoryDatastore(), peers[2])

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
    const ids = new Set(provs.map((peerId) => peerId.toB58String()))
    expect(ids.has(peers[0].toB58String())).to.be.eql(true)
  })

  it('more providers than space in the lru cache', async () => {
    providers = new Providers(new MemoryDatastore(), peers[2], 10)

    const hashes = await Promise.all([...new Array(100)].map((i) => {
      return sha256.digest(uint8ArrayFromString(`hello ${i}`))
    }))

    const cids = hashes.map((h) => CID.createV0(h))

    await Promise.all(cids.map(cid => providers.addProvider(cid, peers[0])))
    const provs = await Promise.all(cids.map(cid => providers.getProviders(cid)))

    expect(provs).to.have.length(100)
    for (const p of provs) {
      expect(p[0].id).to.be.eql(peers[0].id)
    }
  })

  it('expires', async () => {
    providers = new Providers(new MemoryDatastore(), peers[2])
    providers.cleanupInterval = 100
    providers.provideValidity = 200

    providers.start()

    const cid = CID.parse('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    await Promise.all([
      providers.addProvider(cid, peers[0]),
      providers.addProvider(cid, peers[1])
    ])

    const provs = await providers.getProviders(cid)

    expect(provs).to.have.length(2)
    expect(provs[0].id).to.be.eql(peers[0].id)
    expect(provs[1].id).to.be.eql(peers[1].id)

    await new Promise(resolve => setTimeout(resolve, 400))

    const provsAfter = await providers.getProviders(cid)
    expect(provsAfter).to.have.length(0)
    providers.stop()
  })

  // slooow so only run when you need to
  it.skip('many', async function () {
    const p = path.join(
      os.tmpdir(), (Math.random() * 100).toString()
    )
    const store = new LevelDatastore(p)
    await store.open()
    providers = new Providers(store, peers[2], 10)

    console.log('starting') // eslint-disable-line no-console
    const [createdValues, createdPeers] = await Promise.all([
      createValues(100),
      createPeerId(600)
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
