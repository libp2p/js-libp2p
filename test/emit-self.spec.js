/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const series = require('async/series')

const FloodSub = require('../src')

const {
  createNode
} = require('./utils')

const shouldNotHappen = (_) => expect.fail()

describe('emit self', () => {
  const topic = 'Z'

  describe('enabled', () => {
    let nodeA
    let fsA

    before((done) => {
      createNode((err, node) => {
        if (err) {
          return done(err)
        }
        nodeA = node
        nodeA.start(done)
      })
    })

    before((done) => {
      fsA = new FloodSub(nodeA, { emitSelf: true })
      fsA.start(done)
    })

    before(() => {
      fsA.subscribe(topic)
    })

    after((done) => {
      series([
        (cb) => fsA.stop(cb),
        (cb) => nodeA.stop(cb)
      ], done)
    })

    it('should emit to self on publish', async () => {
      const promise = new Promise((resolve) => fsA.once(topic, resolve))

      fsA.publish(topic, Buffer.from('hey'))

      await promise
    })
  })

  describe('disabled', () => {
    let nodeA
    let fsA

    before((done) => {
      createNode((err, node) => {
        if (err) {
          return done(err)
        }
        nodeA = node
        nodeA.start(done)
      })
    })

    before((done) => {
      fsA = new FloodSub(nodeA, { emitSelf: false })
      fsA.start(done)
    })

    before(() => {
      fsA.subscribe(topic)
    })

    after((done) => {
      series([
        (cb) => fsA.stop(cb),
        (cb) => nodeA.stop(cb)
      ], done)
    })

    it('should emit to self on publish', async () => {
      fsA.once(topic, (m) => shouldNotHappen)

      fsA.publish(topic, Buffer.from('hey'))

      // Wait 1 second to guarantee that self is not noticed
      await new Promise((resolve) => setTimeout(() => resolve(), 1000))
    })
  })
})
