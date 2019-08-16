/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const promiseToCallback = require('promise-to-callback')

const Message = require('../../../src/message')
const utils = require('../../../src/utils')
const handler = require('../../../src/rpc/handlers/get-providers')

const T = Message.TYPES.GET_PROVIDERS

const createPeerInfo = require('../../utils/create-peer-info')
const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - GetProviders', () => {
  let peers
  let values
  let tdht
  let dht

  before((done) => {
    parallel([
      (cb) => createPeerInfo(3, cb),
      (cb) => createValues(2, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      peers = res[0]
      values = res[1]
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

  it('errors with an invalid key ', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 0)

    handler(dht)(peers[0], msg, (err, response) => {
      expect(err.code).to.eql('ERR_INVALID_CID')
      expect(response).to.not.exist()
      done()
    })
  })

  it('responds with self if the value is in the datastore', (done) => {
    const v = values[0]

    const msg = new Message(T, v.cid.buffer, 0)
    const dsKey = utils.bufferToKey(v.cid.buffer)

    waterfall([
      (cb) => promiseToCallback(dht.datastore.put(dsKey, v.value))(cb),
      (_, cb) => handler(dht)(peers[0], msg, cb)
    ], (err, response) => {
      expect(err).to.not.exist()

      expect(response.key).to.be.eql(v.cid.buffer)
      expect(response.providerPeers).to.have.length(1)
      expect(response.providerPeers[0].id.toB58String())
        .to.eql(dht.peerInfo.id.toB58String())

      done()
    })
  })

  it('responds with listed providers and closer peers', (done) => {
    const v = values[0]

    const msg = new Message(T, v.cid.buffer, 0)
    const prov = peers[1].id
    const closer = peers[2]

    waterfall([
      (cb) => dht._add(closer, cb),
      (cb) => promiseToCallback(dht.providers.addProvider(v.cid, prov))(err => cb(err)),
      (cb) => handler(dht)(peers[0], msg, cb)
    ], (err, response) => {
      expect(err).to.not.exist()

      expect(response.key).to.be.eql(v.cid.buffer)
      expect(response.providerPeers).to.have.length(1)
      expect(response.providerPeers[0].id.toB58String())
        .to.eql(prov.toB58String())

      expect(response.closerPeers).to.have.length(1)
      expect(response.closerPeers[0].id.toB58String())
        .to.eql(closer.id.toB58String())
      done()
    })
  })
})
