/* eslint-env mocha */

import { LevelDatastore } from 'datastore-level'
import path from 'path'
import os from 'os'
import { Providers } from '../src/providers.js'
import { createValues } from './utils/create-values.js'
import { createPeerIds } from './utils/create-peer-id.js'
import { MemoryDatastore } from 'datastore-core/memory'

describe('Providers', () => {
  let providers: Providers

  before(async function () {
    this.timeout(10 * 1000)
  })

  afterEach(async () => {
    await providers?.stop()
  })

  // slooow so only run when you need to
  it.skip('many', async function () {
    const p = path.join(
      os.tmpdir(), (Math.random() * 100).toString()
    )
    const store = new LevelDatastore(p)
    await store.open()
    providers = new Providers({
      datastore: new MemoryDatastore()
    }, {
      cacheSize: 10
    })

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
