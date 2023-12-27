/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { type Message, MessageType } from '../../../src/message/dht.js'
import { PingHandler } from '../../../src/rpc/handlers/ping.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { PeerId } from '@libp2p/interface'

const T = MessageType.PING

describe('rpc - handlers - Ping', () => {
  let sourcePeer: PeerId
  let handler: DHTMessageHandler

  beforeEach(async () => {
    sourcePeer = await createPeerId()
  })

  beforeEach(async () => {
    handler = new PingHandler({
      logger: defaultLogger()
    }, {
      logPrefix: ''
    })
  })

  it('replies with the same message', async () => {
    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('hello'),
      closer: [],
      providers: []
    }
    const response = await handler.handle(sourcePeer, msg)

    expect(response).to.be.deep.equal(msg)
  })
})
