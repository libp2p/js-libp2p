/* eslint-env mocha */

import { expect } from 'aegir/chai'
import mergeOptions from 'merge-options'
import pDefer from 'p-defer'
import delay from 'delay'
import { createLibp2p, Libp2p } from '../../src/index.js'
import { pubsubSubsystemOptions } from './utils.js'
import { createPeerId } from '../utils/creators/peer.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub } from '@libp2p/floodsub'
import type { PubSub } from '@libp2p/interface-pubsub'

describe('Pubsub subsystem is configurable', () => {
  let libp2p: Libp2p<{ pubsub: PubSub }>

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should not throw if the module is provided', async () => {
    libp2p = await createLibp2p(pubsubSubsystemOptions)
    await libp2p.start()
    expect(libp2p.services.pubsub.getTopics()).to.be.empty()
  })

  it('should start and stop by default once libp2p starts', async () => {
    const peerId = await createPeerId()

    const customOptions = mergeOptions(pubsubSubsystemOptions, {
      start: false,
      peerId
    })

    libp2p = await createLibp2p(customOptions)
    // @ts-expect-error not part of interface
    expect(libp2p.services.pubsub.isStarted()).to.equal(false)

    await libp2p.start()
    // @ts-expect-error not part of interface
    expect(libp2p.services.pubsub.isStarted()).to.equal(true)

    await libp2p.stop()
    // @ts-expect-error not part of interface
    expect(libp2p.services.pubsub.isStarted()).to.equal(false)
  })
})

describe('Pubsub subscription handlers adapter', () => {
  let libp2p: Libp2p<{ pubsub: PubSub }>

  beforeEach(async () => {
    const peerId = await createPeerId()

    libp2p = await createLibp2p(mergeOptions(pubsubSubsystemOptions, {
      peerId,
      services: {
        pubsub: floodsub({
          emitSelf: true
        })
      }
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

    const handler = (): void => {
      countMessages++
      defer.resolve()
    }

    const pubsub: PubSub | undefined = libp2p.services.pubsub

    if (pubsub == null) {
      throw new Error('Pubsub was not enabled')
    }

    pubsub.subscribe(topic)
    pubsub.addEventListener('message', handler)
    await pubsub.publish(topic, uint8ArrayFromString('useless-data'))
    await defer.promise

    pubsub.unsubscribe(topic)
    pubsub.removeEventListener('message', handler)
    await pubsub.publish(topic, uint8ArrayFromString('useless-data'))

    // wait to guarantee that the handler is not called twice
    await delay(100)

    expect(countMessages).to.equal(1)
  })
})
