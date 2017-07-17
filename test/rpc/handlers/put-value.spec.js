/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Record = require('libp2p-record').Record
const Buffer = require('safe-buffer').Buffer

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/put-value')
const utils = require('../../../src/utils')

const util = require('../../utils')

const T = Message.TYPES.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
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

  it('errors on missing record', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 5)
    handler(dht)(peers[0], msg, (err, response) => {
      expect(err).to.match(/Empty record/)
      done()
    })
  })

  it('stores the record in the datastore', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 5)
    const record = new Record(
      Buffer.from('hello'),
      Buffer.from('world'),
      peers[0].id
    )
    msg.record = record

    handler(dht)(peers[1], msg, (err, response) => {
      expect(err).to.not.exist()
      expect(response).to.be.eql(msg)

      const key = utils.bufferToKey(Buffer.from('hello'))
      dht.datastore.get(key, (err, res) => {
        expect(err).to.not.exist()
        const rec = Record.deserialize(res)

        expect(rec).to.have.property('key').eql(Buffer.from('hello'))

        // make sure some time has passed
        setTimeout(() => {
          expect(rec.timeReceived < new Date()).to.be.eql(true)
          done()
        }, 10)
      })
    })
  })
})
