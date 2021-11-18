/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Message } = require('../../../src/message')
const { PingHandler } = require('../../../src/rpc/handlers/ping')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const T = Message.TYPES.PING

const createPeerId = require('../../utils/create-peer-id')

describe('rpc - handlers - Ping', () => {
  let peerIds
  let handler

  before(async () => {
    peerIds = await createPeerId(2)
  })

  beforeEach(async () => {
    handler = new PingHandler()
  })

  it('replies with the same message', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 5)
    const response = await handler.handle(peerIds[0], msg)

    expect(response).to.be.eql(msg)
  })
})
