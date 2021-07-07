/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/ping')
const uint8ArrayFromString = require('uint8arrays/from-string')

const T = Message.TYPES.PING

const createPeerId = require('../../utils/create-peer-id')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - Ping', () => {
  let peerIds
  let tdht
  let dht

  before(async () => {
    peerIds = await createPeerId(2)
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('replies with the same message', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 5)
    const response = await handler(dht)(peerIds[0], msg)

    expect(response).to.be.eql(msg)
  })
})
