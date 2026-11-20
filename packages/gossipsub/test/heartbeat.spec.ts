import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { GossipsubHeartbeatInitialDelay, GossipsubHeartbeatInterval } from '../src/constants.ts'
import { createComponents } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

describe('heartbeat', () => {
  let node: GossipSubAndComponents

  before(async () => {
    node = await createComponents({
      init: {
        emitSelf: true
      }
    })
  })

  after(async () => {
    await stop(node.pubsub, ...Object.entries(node.components))
  })

  it('should occur with regularity defined by a constant', async function () {
    this.timeout(GossipsubHeartbeatInterval * 5)

    await pEvent(node.pubsub, 'gossipsub:heartbeat')
    const t1 = Date.now()

    await pEvent(node.pubsub, 'gossipsub:heartbeat')
    const t2 = Date.now()

    const safeFactor = 1.5
    expect(t2 - t1).to.be.lt(GossipsubHeartbeatInterval * safeFactor)
  })
})

describe('heartbeat after stop', () => {
  let clock: sinon.SinonFakeTimers
  let node: GossipSubAndComponents | undefined

  beforeEach(() => {
    clock = sinon.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
    })
  })

  afterEach(async () => {
    if (node != null) {
      await stop(node.pubsub, ...Object.entries(node.components))
      node = undefined
    }

    clock.restore()
  })

  it('should not run again once the node is stopped', async () => {
    node = await createComponents({ init: {} })
    const heartbeat = sinon.spy(node.pubsub, 'heartbeat')

    // the first heartbeat runs after the initial delay, the next one is armed
    await clock.tickAsync(GossipsubHeartbeatInitialDelay)
    expect(heartbeat.callCount).to.equal(1)

    await node.pubsub.stop()

    await clock.tickAsync(GossipsubHeartbeatInterval * 3)
    expect(heartbeat.callCount).to.equal(1)
  })

  it('should not run if the node is stopped before the initial delay', async () => {
    node = await createComponents({ init: {} })
    const heartbeat = sinon.spy(node.pubsub, 'heartbeat')

    await node.pubsub.stop()

    await clock.tickAsync(GossipsubHeartbeatInitialDelay + GossipsubHeartbeatInterval * 3)
    expect(heartbeat.callCount).to.equal(0)
  })
})
