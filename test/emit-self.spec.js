/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect

const FloodSub = require('../src')

const {
  createPeerInfo, mockRegistrar
} = require('./utils')

const shouldNotHappen = (_) => expect.fail()

describe('emit self', () => {
  let floodsub
  let peerInfo
  const topic = 'Z'

  describe('enabled', () => {
    before(async () => {
      peerInfo = await createPeerInfo()
      floodsub = new FloodSub(peerInfo, mockRegistrar, { emitSelf: true })
    })

    before(async () => {
      await floodsub.start()

      floodsub.subscribe(topic)
    })

    after(() => floodsub.stop())

    it('should emit to self on publish', () => {
      const promise = new Promise((resolve) => floodsub.once(topic, resolve))

      floodsub.publish(topic, Buffer.from('hey'))

      return promise
    })
  })

  describe('disabled', () => {
    before(async () => {
      peerInfo = await createPeerInfo()
      floodsub = new FloodSub(peerInfo, mockRegistrar, { emitSelf: false })
    })

    before(async () => {
      await floodsub.start()

      floodsub.subscribe(topic)
    })

    after(() => floodsub.stop())

    it('should emit to self on publish', () => {
      floodsub.once(topic, (m) => shouldNotHappen)

      floodsub.publish(topic, Buffer.from('hey'))

      // Wait 1 second to guarantee that self is not noticed
      return new Promise((resolve) => setTimeout(() => resolve(), 1000))
    })
  })
})
