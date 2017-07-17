/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const waterfall = require('async/waterfall')
const Buffer = require('safe-buffer').Buffer
const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/get-value')
const utils = require('../../../src/utils')
const util = require('../../utils')

const T = Message.TYPES.GET_VALUE

describe('rpc - handlers - GetValue', () => {
  let peers
  let dht

  before((done) => {
    util.makePeers(2, (err, res) => {
      expect(err).to.not.exist()
      peers = res
      done()
    })
  })

  afterEach((done) => util.teardown(done))

  beforeEach((done) => {
    util.setupDHT((err, res) => {
      expect(err).to.not.exist()
      dht = res
      done()
    })
  })

  it('errors when missing key', (done) => {
    const msg = new Message(T, Buffer.alloc(0), 0)

    handler(dht)(peers[0], msg, (err, response) => {
      expect(err).to.match(/Invalid key/)
      expect(response).to.not.exist()
      done()
    })
  })

  it('responds with a local value', (done) => {
    const key = Buffer.from('hello')
    const value = Buffer.from('world')
    const msg = new Message(T, key, 0)

    waterfall([
      (cb) => dht.put(key, value, cb),
      (cb) => handler(dht)(peers[0], msg, cb)
    ], (err, response) => {
      expect(err).to.not.exist()
      expect(response.record).to.exist()
      expect(response.record.key).to.eql(key)
      expect(response.record.value).to.eql(value)
      done()
    })
  })

  it('responds with closerPeers returned from the dht', (done) => {
    const key = Buffer.from('hello')
    const msg = new Message(T, key, 0)
    const other = peers[1]

    waterfall([
      (cb) => dht._add(other, cb),
      (cb) => handler(dht)(peers[0], msg, cb)
    ], (err, response) => {
      expect(err).to.not.exist()
      expect(response.closerPeers).to.have.length(1)
      expect(
        response.closerPeers[0].id.toB58String()
      ).to.be.eql(other.id.toB58String())
      done()
    })
  })

  describe('public key', () => {
    it('self', (done) => {
      const key = utils.keyForPublicKey(dht.peerInfo.id)

      const msg = new Message(T, key, 0)

      waterfall([
        (cb) => handler(dht)(peers[0], msg, cb)
      ], (err, response) => {
        expect(err).to.not.exist()
        expect(response.record).to.exist()
        expect(response.record.value).to.eql(
          dht.peerInfo.id.pubKey.bytes
        )
        done()
      })
    })

    it('other in peerstore', (done) => {
      const other = peers[1]
      const key = utils.keyForPublicKey(other.id)

      const msg = new Message(T, key, 0)

      waterfall([
        (cb) => dht._add(other, cb),
        (cb) => handler(dht)(peers[0], msg, cb)
      ], (err, response) => {
        expect(err).to.not.exist()
        expect(response.record).to.exist()
        expect(response.record.value).to.eql(
          other.id.pubKey.bytes
        )
        done()
      })
    })

    it('other unkown', (done) => {
      const other = peers[1]
      const key = utils.keyForPublicKey(other.id)

      const msg = new Message(T, key, 0)

      waterfall([
        (cb) => handler(dht)(peers[0], msg, cb)
      ], (err, response) => {
        expect(err).to.not.exist()
        expect(response.record).to.not.exist()

        done()
      })
    })
  })
})
