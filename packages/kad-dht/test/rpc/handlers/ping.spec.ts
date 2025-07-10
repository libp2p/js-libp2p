/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MessageType } from '../../../src/message/dht.js'
import { PingHandler } from '../../../src/rpc/handlers/ping.js'
import { createPeerIdWithPrivateKey } from '../../utils/create-peer-id.js'
import type { Message } from '../../../src/message/dht.js'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { PeerAndKey } from '../../utils/create-peer-id.js'

const T = MessageType.PING

describe('rpc - handlers - Ping', () => {
  let sourcePeer: PeerAndKey
  let handler: DHTMessageHandler

  beforeEach(async () => {
    sourcePeer = await createPeerIdWithPrivateKey()
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
      closer: [],
      providers: []
    }
    const response = await handler.handle(sourcePeer.peerId, msg)

    expect(response).to.be.deep.equal(msg)
  })
})
