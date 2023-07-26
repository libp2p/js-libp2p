/* eslint-env mocha */

import { start, stop } from '@libp2p/interface/startable'
import { connectionPair } from '@libp2p/interface-compliance-tests/mocks'
import { expect } from 'aegir/chai'
import type { Components } from 'libp2p/components'
import { perfService  } from '../src/index.js'
import { createComponents, defaultInit } from '../src/main.js'

describe('perf', () => {
  let localComponents: Components
  let remoteComponents: Components

  beforeEach(async () => {
    localComponents = await createComponents()
    remoteComponents = await createComponents()

    await Promise.all([
      start(localComponents),
      start(remoteComponents)
    ])
  })

  afterEach(async () => {
    await Promise.all([
      stop(localComponents),
      stop(remoteComponents)
    ])
  })

  it('should run perf', async () => {
    const client = perfService(defaultInit)(localComponents)
    const server = perfService(defaultInit)(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    // Run Perf
    await expect(client.perf(remoteComponents.peerId, 1024n, 1024n)).to.eventually.be.fulfilled()
  })

  it('should output bandwidth', async () => {
    const client = perfService(defaultInit)(localComponents)
    const server = perfService(defaultInit)(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)
    localComponents.events.safeDispatchEvent('connection:open', { detail: localToRemote })
    remoteComponents.events.safeDispatchEvent('connection:open', { detail: remoteToLocal })

    let downloadBandwidth = 0
    let uploadBandwidth = 0

    for (let i = 1; i < 5; i++) {
      // Run Perf
      downloadBandwidth += await client.measureDownloadBandwidth(remoteComponents.peerId, 10485760n)
      uploadBandwidth += await client.measureUploadBandwidth(remoteComponents.peerId, 10485760n)
    }

    // eslint-disable-next-line no-console
    console.log('Upload bandwidth:', Math.floor(downloadBandwidth / 5), 'B/s')

    // eslint-disable-next-line no-console
    console.log('Download bandwidth:', Math.floor(uploadBandwidth / 5), 'B/s')
  })
})
