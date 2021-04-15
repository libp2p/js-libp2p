'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const mergeOptions = require('merge-options')
const { Multiaddr } = require('multiaddr')

const { create } = require('../../src')
const { baseOptions, subsystemOptions } = require('./utils')
const peerUtils = require('../utils/creators/peer')

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Pubsub subsystem is configurable', () => {
  let libp2p

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('should not exist if no module is provided', async () => {
    libp2p = await create(baseOptions)
    expect(libp2p.pubsub).to.not.exist()
  })

  it('should exist if the module is provided', async () => {
    libp2p = await create(subsystemOptions)
    expect(libp2p.pubsub).to.exist()
  })

  it('should start and stop by default once libp2p starts', async () => {
    const [peerId] = await peerUtils.createPeerId()

    const customOptions = mergeOptions(subsystemOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      }
    })

    libp2p = await create(customOptions)
    expect(libp2p.pubsub.started).to.equal(false)

    await libp2p.start()
    expect(libp2p.pubsub.started).to.equal(true)

    await libp2p.stop()
    expect(libp2p.pubsub.started).to.equal(false)
  })

  it('should not start if disabled once libp2p starts', async () => {
    const [peerId] = await peerUtils.createPeerId()

    const customOptions = mergeOptions(subsystemOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      config: {
        pubsub: {
          enabled: false
        }
      }
    })

    libp2p = await create(customOptions)
    expect(libp2p.pubsub.started).to.equal(false)

    await libp2p.start()
    expect(libp2p.pubsub.started).to.equal(false)
  })

  it('should allow a manual start', async () => {
    const [peerId] = await peerUtils.createPeerId()

    const customOptions = mergeOptions(subsystemOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      config: {
        pubsub: {
          enabled: false
        }
      }
    })

    libp2p = await create(customOptions)
    await libp2p.start()
    expect(libp2p.pubsub.started).to.equal(false)

    await libp2p.pubsub.start()
    expect(libp2p.pubsub.started).to.equal(true)
  })
})
