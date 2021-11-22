/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Record } = require('libp2p-record')
const delay = require('delay')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const { Message } = require('../../../src/message')
const { PutValueHandler } = require('../../../src/rpc/handlers/put-value')
const utils = require('../../../src/utils')

const createPeerId = require('../../utils/create-peer-id')
const TestDHT = require('../../utils/test-dht')

const T = Message.TYPES.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let peerIds
  let tdht
  let dht
  let handler

  before(async () => {
    tdht = new TestDHT()
    peerIds = await createPeerId(2)
  })

  beforeEach(async () => {
    [dht] = await tdht.spawn(1)

    handler = new PutValueHandler({
      validators: dht._lan._validators,
      records: dht._lan._contentFetching._records
    })
  })

  afterEach(() => tdht.teardown())

  it('errors on missing record', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 5)

    try {
      await handler.handle(peerIds[0], msg)
    } catch (/** @type {any} */ err) {
      expect(err.code).to.eql('ERR_EMPTY_RECORD')
      return
    }

    throw new Error('should error on missing record')
  })

  it('stores the record in the datastore', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 5)
    const record = new Record(
      uint8ArrayFromString('hello'),
      uint8ArrayFromString('world')
    )
    msg.record = record

    const response = await handler.handle(peerIds[1], msg)
    expect(response).to.be.eql(msg)

    const key = utils.bufferToKey(uint8ArrayFromString('hello'))
    const res = await dht._lan._contentFetching._records.get(key)

    const rec = Record.deserialize(res)

    expect(rec).to.have.property('key').eql(uint8ArrayFromString('hello'))

    // make sure some time has passed
    await delay(10)
    expect(rec.timeReceived < new Date()).to.be.eql(true)
  })
})
