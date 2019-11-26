/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const { Record } = require('libp2p-record')
const delay = require('delay')

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/put-value')
const utils = require('../../../src/utils')

const createPeerInfo = require('../../utils/create-peer-info')
const TestDHT = require('../../utils/test-dht')

const T = Message.TYPES.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let peers
  let tdht
  let dht

  before(async () => {
    peers = await createPeerInfo(2)
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('errors on missing record', async () => {
    const msg = new Message(T, Buffer.from('hello'), 5)

    try {
      await handler(dht)(peers[0], msg)
    } catch (err) {
      expect(err.code).to.eql('ERR_EMPTY_RECORD')
      return
    }

    throw new Error('should error on missing record')
  })

  it('stores the record in the datastore', async () => {
    const msg = new Message(T, Buffer.from('hello'), 5)
    const record = new Record(
      Buffer.from('hello'),
      Buffer.from('world')
    )
    msg.record = record

    const response = await handler(dht)(peers[1], msg)
    expect(response).to.be.eql(msg)

    const key = utils.bufferToKey(Buffer.from('hello'))
    const res = await dht.datastore.get(key)

    const rec = Record.deserialize(res)

    expect(rec).to.have.property('key').eql(Buffer.from('hello'))

    // make sure some time has passed
    await delay(10)
    expect(rec.timeReceived < new Date()).to.be.eql(true)
  })
})
