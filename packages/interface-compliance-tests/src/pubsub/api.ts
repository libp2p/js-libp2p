import { isStartable, start, stop } from '@libp2p/interface/startable'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { mockNetwork } from '../mocks/index.js'
import { createComponents } from './utils.js'
import type { PubSubArgs, PubSubComponents } from './index.js'
import type { TestSetup } from '../index.js'
import type { PubSub } from '@libp2p/interface/pubsub'

const topic = 'foo'
const data = uint8ArrayFromString('bar')

export default (common: TestSetup<PubSub, PubSubArgs>): void => {
  describe('pubsub api', () => {
    let pubsub: PubSub
    let components: PubSubComponents

    // Create pubsub router
    beforeEach(async () => {
      mockNetwork.reset()
      components = await createComponents()

      pubsub = components.pubsub = await common.setup({
        components,
        init: {
          emitSelf: true
        }
      })
    })

    afterEach(async () => {
      sinon.restore()
      await stop(...Object.values(components))
      await common.teardown()
      mockNetwork.reset()
    })

    it('can start correctly', async () => {
      if (!isStartable(pubsub)) {
        return
      }

      sinon.spy(components.registrar, 'register')

      await start(...Object.values(components))

      expect(components.registrar.register).to.have.property('callCount', 1)
    })

    it('can stop correctly', async () => {
      if (!isStartable(pubsub)) {
        return
      }

      sinon.spy(components.registrar, 'unregister')

      await start(...Object.values(components))
      await stop(...Object.values(components))

      expect(components.registrar.unregister).to.have.property('callCount', 1)
    })

    it('can subscribe and unsubscribe correctly', async () => {
      const handler = (): void => {
        throw new Error('a message should not be received')
      }

      await start(...Object.values(components))
      pubsub.subscribe(topic)
      pubsub.addEventListener('message', handler)

      await pWaitFor(() => {
        const topics = pubsub.getTopics()
        return topics.length === 1 && topics[0] === topic
      })

      pubsub.removeEventListener('message', handler)
      pubsub.unsubscribe(topic)

      await pWaitFor(() => pubsub.getTopics().length === 0)

      // Publish to guarantee the handler is not called
      await pubsub.publish(topic, data)

      // handlers are called async
      await delay(100)

      await stop(...Object.values(components))
    })

    it('can subscribe and publish correctly', async () => {
      const defer = pDefer()

      await start(...Object.values(components))

      pubsub.subscribe(topic)
      pubsub.addEventListener('message', (evt) => {
        expect(evt).to.have.nested.property('detail.topic', topic)
        expect(evt).to.have.deep.nested.property('detail.data', data)
        defer.resolve()
      })
      await pubsub.publish(topic, data)
      await defer.promise

      await stop(...Object.values(components))
    })
  })
}
