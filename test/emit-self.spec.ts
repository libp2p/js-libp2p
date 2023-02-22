import { expect } from 'aegir/chai'
import {
  createPeerId,
  MockRegistrar,
  PubsubImplementation
} from './utils/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import delay from 'delay'

const protocol = '/pubsub/1.0.0'
const topic = 'foo'
const data = uint8ArrayFromString('bar')
const shouldNotHappen = (): void => expect.fail()

describe('emitSelf', () => {
  let pubsub: PubsubImplementation

  describe('enabled', () => {
    before(async () => {
      const peerId = await createPeerId()

      pubsub = new PubsubImplementation({
        peerId,
        registrar: new MockRegistrar()
      }, {
        multicodecs: [protocol],
        emitSelf: true
      })
    })

    before(async () => {
      await pubsub.start()
      pubsub.subscribe(topic)
    })

    after(async () => {
      await pubsub.stop()
    })

    it('should emit to self on publish', async () => {
      pubsub.subscribe(topic)

      const promise = new Promise<void>((resolve) => {
        pubsub.addEventListener('message', (evt) => {
          if (evt.detail.topic === topic) {
            resolve()
          }
        })
      })

      await pubsub.publish(topic, data)

      await promise
    })

    it('should publish a message without data', async () => {
      pubsub.subscribe(topic)

      const promise = new Promise<void>((resolve) => {
        pubsub.addEventListener('message', (evt) => {
          if (evt.detail.topic === topic) {
            resolve()
          }
        })
      })

      await pubsub.publish(topic)

      await promise
    })
  })

  describe('disabled', () => {
    before(async () => {
      const peerId = await createPeerId()

      pubsub = new PubsubImplementation({
        peerId,
        registrar: new MockRegistrar()
      }, {
        multicodecs: [protocol],
        emitSelf: false
      })
    })

    before(async () => {
      await pubsub.start()
      pubsub.subscribe(topic)
    })

    after(async () => {
      await pubsub.stop()
    })

    it('should not emit to self on publish', async () => {
      pubsub.subscribe(topic)
      pubsub.addEventListener('message', shouldNotHappen)

      await pubsub.publish(topic, data)

      // Wait 1 second to guarantee that self is not noticed
      await delay(1000)
    })
  })
})
