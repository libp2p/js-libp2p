/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { type Message, MessageType } from '../../../src/message/dht.js'
import { Libp2pRecord } from '../../../src/record/index.js'
import { PutValueHandler } from '../../../src/rpc/handlers/put-value.js'
import * as utils from '../../../src/utils.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { Validators } from '../../../src/index.js'
import type { PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

const T = MessageType.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let sourcePeer: PeerId
  let handler: PutValueHandler
  let datastore: Datastore
  let validators: Validators

  beforeEach(async () => {
    sourcePeer = await createPeerId()
    datastore = new MemoryDatastore()
    validators = {}

    const components = {
      datastore,
      logger: defaultLogger()
    }

    handler = new PutValueHandler(components, {
      validators,
      logPrefix: ''
    })
  })

  it('errors on missing record', async () => {
    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('hello'),
      closer: [],
      providers: []
    }

    try {
      await handler.handle(sourcePeer, msg)
    } catch (err: any) {
      expect(err.code).to.eql('ERR_EMPTY_RECORD')
      return
    }

    throw new Error('should error on missing record')
  })

  it('stores the record in the datastore', async () => {
    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('/val/hello'),
      closer: [],
      providers: []
    }
    const record = new Libp2pRecord(
      uint8ArrayFromString('hello'),
      uint8ArrayFromString('world'),
      new Date()
    )
    msg.record = record.serialize()
    validators.val = async () => {}

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
