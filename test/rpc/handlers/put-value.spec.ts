/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { expect } from 'aegir/utils/chai.js'
import { Libp2pRecord } from '@libp2p/record'
import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MESSAGE_TYPE } from '../../../src/message/index.js'
import { PutValueHandler } from '../../../src/rpc/handlers/put-value.js'
import * as utils from '../../../src/utils.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Datastore } from 'interface-datastore'
import { MemoryDatastore } from 'datastore-core'
import type { Validators } from '@libp2p/interfaces/dht'

const T = MESSAGE_TYPE.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let sourcePeer: PeerId
  let handler: DHTMessageHandler
  let datastore: Datastore
  let validators: Validators

  beforeEach(async () => {
    sourcePeer = await createPeerId()
    datastore = new MemoryDatastore()
    validators = {}

    // @ts-expect-error
    handler = new PutValueHandler({
      validators,
      datastore
    })
  })

  it('errors on missing record', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 5)

    try {
      await handler.handle(sourcePeer, msg)
    } catch (err: any) {
      expect(err.code).to.eql('ERR_EMPTY_RECORD')
      return
    }

    throw new Error('should error on missing record')
  })

  it('stores the record in the datastore', async () => {
    const msg = new Message(T, uint8ArrayFromString('/val/hello'), 5)
    const record = new Libp2pRecord(
      uint8ArrayFromString('hello'),
      uint8ArrayFromString('world')
    )
    msg.record = record
    validators.val = {
      func: async () => {}
    }

    const response = await handler.handle(sourcePeer, msg)
    expect(response).to.deep.equal(msg)

    const key = utils.bufferToRecordKey(uint8ArrayFromString('hello'))
    const res = await datastore.get(key)

    const rec = Libp2pRecord.deserialize(res)

    expect(rec).to.have.property('key').eql(uint8ArrayFromString('hello'))

    if (rec.timeReceived == null) {
      throw new Error('Libp2pRecord timeReceived not set')
    }

    // make sure some time has passed
    await delay(10)
    expect(rec.timeReceived.getTime()).to.be.lessThan(Date.now())
  })
})
