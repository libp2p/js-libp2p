/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const uint8ArrayFromString = require('uint8arrays/from-string')
const FloodSub = require('../src')

const {
  createPeerId, mockRegistrar
} = require('./utils')

const shouldNotHappen = (_) => expect.fail()

describe('emit self', () => {
  let floodsub
  let peerId
  const topic = 'Z'

  describe('enabled', () => {
    before(async () => {
      peerId = await createPeerId()
      floodsub = new FloodSub(peerId, mockRegistrar, { emitSelf: true })
    })

    before(async () => {
      await floodsub.start()

      floodsub.subscribe(topic)
    })

    after(() => floodsub.stop())

    it('should emit to self on publish', () => {
      const promise = new Promise((resolve) => floodsub.once(topic, resolve))

      floodsub.publish(topic, uint8ArrayFromString('hey'))

      return promise
    })
  })

  describe('disabled', () => {
    before(async () => {
      peerId = await createPeerId()
      floodsub = new FloodSub(peerId, mockRegistrar, { emitSelf: false })
    })

    before(async () => {
      await floodsub.start()

      floodsub.subscribe(topic)
    })

    after(() => floodsub.stop())

    it('should emit to self on publish', () => {
      floodsub.once(topic, (m) => shouldNotHappen)

      floodsub.publish(topic, uint8ArrayFromString('hey'))

      // Wait 1 second to guarantee that self is not noticed
      return new Promise((resolve) => setTimeout(() => resolve(), 1000))
    })
  })
})
