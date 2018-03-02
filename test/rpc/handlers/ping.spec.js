/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/ping')

const T = Message.TYPES.PING

const createPeerInfo = require('../../utils/create-peer-info')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - Ping', () => {
  let peers
  let tdht
  let dht

  before((done) => {
    createPeerInfo(2, (err, res) => {
      expect(err).to.not.exist()
      peers = res
      done()
    })
  })

  beforeEach((done) => {
    tdht = new TestDHT()

    tdht.spawn(1, (err, dhts) => {
      expect(err).to.not.exist()
      dht = dhts[0]
      done()
    })
  })

  afterEach((done) => {
    tdht.teardown(done)
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
