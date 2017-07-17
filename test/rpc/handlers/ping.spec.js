/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Buffer = require('safe-buffer').Buffer
const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/ping')

const util = require('../../utils')

const T = Message.TYPES.PING

describe('rpc - handlers - Ping', () => {
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

  it('replies with the same message', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 5)

    handler(dht)(peers[0], msg, (err, response) => {
      expect(err).to.not.exist()
      expect(response).to.be.eql(msg)
      done()
    })
  })
})
