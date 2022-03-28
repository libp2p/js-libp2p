/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import mergeOptions from 'merge-options'
import pDefer from 'p-defer'
import delay from 'delay'
import { createLibp2p, Libp2p } from '../../src/index.js'
import { baseOptions, pubsubSubsystemOptions } from './utils.js'
import { createPeerId } from '../utils/creators/peer.js'
import { CustomEvent } from '@libp2p/interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { FloodSub } from '@libp2p/floodsub'
import type { PubSub } from '@libp2p/interfaces/pubsub'

describe('Pubsub subsystem is configurable', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should not exist if no module is provided', async () => {
    libp2p = await createLibp2p(baseOptions)
    expect(libp2p.pubsub).to.not.exist()
  })

  it('should exist if the module is provided', async () => {
    libp2p = await createLibp2p(pubsubSubsystemOptions)
    expect(libp2p.pubsub).to.exist()
  })

  it('should start and stop by default once libp2p starts', async () => {
    const peerId = await createPeerId()

    const customOptions = mergeOptions(pubsubSubsystemOptions, {
      peerId
    })

    libp2p = await createLibp2p(customOptions)
    expect(libp2p.pubsub?.isStarted()).to.equal(false)

    await libp2p.start()
    expect(libp2p.pubsub?.isStarted()).to.equal(true)

    await libp2p.stop()
    expect(libp2p.pubsub?.isStarted()).to.equal(false)
  })
})

describe('Pubsub subscription handlers adapter', () => {
  let libp2p: Libp2p

  beforeEach(async () => {
    const peerId = await createPeerId()

    libp2p = await createLibp2p(mergeOptions(pubsubSubsystemOptions, {
      peerId,
      pubsub: new FloodSub({
        emitSelf: true
      })
    }))

    await libp2p.start()
  })

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('extends pubsub with subscribe handler', async () => {
    let countMessages = 0
    const topic = 'topic'
    const defer = pDefer()

    const handler = () => {
      countMessages++
      defer.resolve()
    }

    const pubsub: PubSub | undefined = libp2p.pubsub

    if (pubsub == null) {
      throw new Error('Pubsub was not enabled')
    }

    pubsub.addEventListener(topic, handler)
    pubsub.dispatchEvent(new CustomEvent<Uint8Array>(topic, {
      detail: uint8ArrayFromString('useless-data')
    }))
    await defer.promise

    pubsub.removeEventListener(topic, handler)
    pubsub.dispatchEvent(new CustomEvent<Uint8Array>(topic, {
      detail: uint8ArrayFromString('useless-data')
    }))

    // wait to guarantee that the handler is not called twice
    await delay(100)

    expect(countMessages).to.equal(1)
  })
})
