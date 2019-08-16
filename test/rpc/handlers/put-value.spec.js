/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Record = require('libp2p-record').Record
const promiseToCallback = require('promise-to-callback')

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/put-value')
const utils = require('../../../src/utils')

const createPeerInfo = require('../../utils/create-peer-info')
// const createValues = require('../../utils/create-values')
const TestDHT = require('../../utils/test-dht')

const T = Message.TYPES.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
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

  it('errors on missing record', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 5)
    handler(dht)(peers[0], msg, (err) => {
      expect(err.code).to.eql('ERR_EMPTY_RECORD')
      done()
    })
  })

  it('stores the record in the datastore', (done) => {
    const msg = new Message(T, Buffer.from('hello'), 5)
    const record = new Record(
      Buffer.from('hello'),
      Buffer.from('world')
    )
    msg.record = record

    handler(dht)(peers[1], msg, (err, response) => {
      expect(err).to.not.exist()
      expect(response).to.be.eql(msg)

      const key = utils.bufferToKey(Buffer.from('hello'))
      promiseToCallback(dht.datastore.get(key))((err, res) => {
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
