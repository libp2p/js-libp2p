'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const mergeOptions = require('merge-options')
const pDefer = require('p-defer')
const delay = require('delay')

const { create } = require('../../src')
const { baseOptions, pubsubSubsystemOptions } = require('./utils')
const peerUtils = require('../utils/creators/peer')

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
    libp2p = await create(pubsubSubsystemOptions)
    expect(libp2p.pubsub).to.exist()
  })

  it('should start and stop by default once libp2p starts', async () => {
    const [peerId] = await peerUtils.createPeerId()

    const customOptions = mergeOptions(pubsubSubsystemOptions, {
      peerId
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

    const customOptions = mergeOptions(pubsubSubsystemOptions, {
      peerId,
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

    const customOptions = mergeOptions(pubsubSubsystemOptions, {
      peerId,
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

describe('Pubsub subscription handlers adapter', () => {
  let libp2p

  beforeEach(async () => {
    const [peerId] = await peerUtils.createPeerId()

    libp2p = await create(mergeOptions(pubsubSubsystemOptions, {
      peerId
    }))

    await libp2p.start()
  })

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('extends pubsub with subscribe handler', async () => {
    let countMessages = 0
    const topic = 'topic'
    const defer = pDefer()

    const handler = () => {
      countMessages++
      if (countMessages > 1) {
        throw new Error('only one message should be received')
      }

      defer.resolve()
    }

    await libp2p.pubsub.subscribe(topic, handler)

    libp2p.pubsub.emit(topic, 'useless-data')
    await defer.promise

    await libp2p.pubsub.unsubscribe(topic, handler)
    libp2p.pubsub.emit(topic, 'useless-data')

    // wait to guarantee that the handler is not called twice
    await delay(100)
  })
})
