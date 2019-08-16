/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const promisify = require('promisify-es6')
const Store = require('interface-datastore').MemoryDatastore
const CID = require('cids')
const LevelStore = require('datastore-level')
const path = require('path')
const os = require('os')
const multihashing = promisify(require('multihashing-async'))

const Providers = require('../src/providers')

const createPeerInfo = promisify(require('./utils/create-peer-info'))
const createValues = promisify(require('./utils/create-values'))

describe('Providers', () => {
  let infos
  let providers

  before(async function () {
    this.timeout(10 * 1000)
    infos = await createPeerInfo(3)
  })

  afterEach(() => {
    providers && providers.stop()
  })

  it('simple add and get of providers', async () => {
    providers = new Providers(new Store(), infos[2].id)

    const cid = new CID('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, infos[0].id),
      providers.addProvider(cid, infos[1].id)
    ])

    const provs = await providers.getProviders(cid)
    const ids = new Set(provs.map((peerId) => peerId.toB58String()))
    expect(ids.has(infos[0].id.toB58String())).to.be.eql(true)
    expect(ids.has(infos[1].id.toB58String())).to.be.eql(true)
  })

  it('duplicate add of provider is deduped', async () => {
    providers = new Providers(new Store(), infos[2].id)

    const cid = new CID('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')

    await Promise.all([
      providers.addProvider(cid, infos[0].id),
      providers.addProvider(cid, infos[0].id),
      providers.addProvider(cid, infos[1].id),
      providers.addProvider(cid, infos[1].id),
      providers.addProvider(cid, infos[1].id)
    ])

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(2)
    const ids = new Set(provs.map((peerId) => peerId.toB58String()))
    expect(ids.has(infos[0].id.toB58String())).to.be.eql(true)
    expect(ids.has(infos[1].id.toB58String())).to.be.eql(true)
  })

  it('more providers than space in the lru cache', async () => {
    providers = new Providers(new Store(), infos[2].id, 10)

    const hashes = await Promise.all([...new Array(100)].map((i) => {
      return multihashing(Buffer.from(`hello ${i}`), 'sha2-256')
    }))

    const cids = hashes.map((h) => new CID(h))

    await Promise.all(cids.map(cid => providers.addProvider(cid, infos[0].id)))
    const provs = await Promise.all(cids.map(cid => providers.getProviders(cid)))

    expect(provs).to.have.length(100)
    for (const p of provs) {
      expect(p[0].id).to.be.eql(infos[0].id.id)
    }
  })

  it('expires', async () => {
    providers = new Providers(new Store(), infos[2].id)
    providers.cleanupInterval = 100
    providers.provideValidity = 200

    const cid = new CID('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n')
    await Promise.all([
      providers.addProvider(cid, infos[0].id),
      providers.addProvider(cid, infos[1].id)
    ])

    const provs = await providers.getProviders(cid)

    expect(provs).to.have.length(2)
    expect(provs[0].id).to.be.eql(infos[0].id.id)
    expect(provs[1].id).to.be.eql(infos[1].id.id)

    await new Promise(resolve => setTimeout(resolve, 400))

    const provsAfter = await providers.getProviders(cid)
    expect(provsAfter).to.have.length(0)
  })

  // slooow so only run when you need to
  it.skip('many', async function () {
    const p = path.join(
      os.tmpdir(), (Math.random() * 100).toString()
    )
    const store = new LevelStore(p)
    providers = new Providers(store, infos[2].id, 10)

    console.log('starting') // eslint-disable-line no-console
    const res = await Promise.all([
      createValues(100),
      createPeerInfo(600)
    ])

    console.log('got values and peers') // eslint-disable-line no-console
    const values = res[0]
    const peers = res[1]
    const total = Date.now()

    for (const v of values) {
      for (const p of peers) {
        await providers.addProvider(v.cid, p.id)
      }
    }

    console.log('addProvider %s peers %s cids in %sms', peers.length, values.length, Date.now() - total) // eslint-disable-line no-console
    console.log('starting profile with %s peers and %s cids', peers.length, values.length) // eslint-disable-line no-console

    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      for (const v of values) {
        await providers.getProviders(v.cid)
        console.log('query %sms', (Date.now() - start)) // eslint-disable-line no-console
      }
    }

    await store.close()
  })
})
