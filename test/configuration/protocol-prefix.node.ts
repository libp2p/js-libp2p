'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const mergeOptions = require('merge-options')

const { create } = require('../../src')
const { baseOptions } = require('./utils')

describe('Protocol prefix is configurable', () => {
  let libp2p

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('protocolPrefix is provided', async () => {
    const testProtocol = 'test-protocol'
    libp2p = await create(mergeOptions(baseOptions, {
      config: {
        protocolPrefix: testProtocol
      }
    }))
    await libp2p.start()

    const protocols = await libp2p.peerStore.protoBook.get(libp2p.peerId)
    expect(protocols).to.include.members([
      '/libp2p/circuit/relay/0.1.0',
      `/${testProtocol}/id/1.0.0`,
      `/${testProtocol}/id/push/1.0.0`,
      `/${testProtocol}/ping/1.0.0`
    ])
  })

  it('protocolPrefix is not provided', async () => {
    libp2p = await create(baseOptions)
    await libp2p.start()

    const protocols = await libp2p.peerStore.protoBook.get(libp2p.peerId)
    expect(protocols).to.include.members([
      '/libp2p/circuit/relay/0.1.0',
      '/ipfs/id/1.0.0',
      '/ipfs/id/push/1.0.0',
      '/ipfs/ping/1.0.0'
    ])
  })
})
