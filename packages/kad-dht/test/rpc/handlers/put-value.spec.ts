/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { defaultLogger } from '@libp2p/logger'
import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MessageType } from '../../../src/message/dht.js'
import { PutValueHandler } from '../../../src/rpc/handlers/put-value.js'
import * as utils from '../../../src/utils.js'
import { createPeerIdWithPrivateKey } from '../../utils/create-peer-id.js'
import type { Selectors, Validators } from '../../../src/index.js'
import type { Message } from '../../../src/message/dht.js'
import type { PeerAndKey } from '../../utils/create-peer-id.js'
import type { Datastore } from 'interface-datastore'

const T = MessageType.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let sourcePeer: PeerAndKey
  let handler: PutValueHandler
  let datastore: Datastore
  let validators: Validators
  let selectors: Selectors

  beforeEach(async () => {
    sourcePeer = await createPeerIdWithPrivateKey()
    datastore = new MemoryDatastore()
    validators = {}
    selectors = {}

    const components = {
      datastore,
      logger: defaultLogger()
    }

    handler = new PutValueHandler(components, {
      validators,
      selectors,
      logPrefix: 'dht',
      datastorePrefix: '/dht'
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
      await handler.handle(sourcePeer.peerId, msg)
    } catch (err: any) {
      expect(err.name).to.equal('InvalidMessageError')
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

    const response = await handler.handle(sourcePeer.peerId, msg)
    expect(response).to.deep.equal(msg)

    const key = utils.bufferToRecordKey('/dht/record', uint8ArrayFromString('hello'))
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

  it('ignores older records when a namespace selector prefers existing values', async () => {
    const recordKey = utils.bufferToRecordKey('/dht/record', uint8ArrayFromString('/val/hello'))
    const existingRecord = new Libp2pRecord(
      uint8ArrayFromString('/val/hello'),
      uint8ArrayFromString('world2'),
      new Date()
    )

    await datastore.put(recordKey, existingRecord.serialize().subarray())

    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('/val/hello'),
      closer: [],
      providers: [],
      record: new Libp2pRecord(
        uint8ArrayFromString('/val/hello'),
        uint8ArrayFromString('world1'),
        new Date()
      ).serialize()
    }

    validators.val = async () => {}
    selectors.val = (key, records) => {
      return records[0][records[1].length - 1] > records[1][records[1].length - 1] ? 0 : 1
    }

    await handler.handle(sourcePeer.peerId, msg)

    const updated = Libp2pRecord.deserialize(await datastore.get(recordKey))
    expect(updated.value).to.equalBytes(uint8ArrayFromString('world2'))
  })

  it('stores newer records when a namespace selector prefers incoming values', async () => {
    const recordKey = utils.bufferToRecordKey('/dht/record', uint8ArrayFromString('/val/hello'))
    const existingRecord = new Libp2pRecord(
      uint8ArrayFromString('/val/hello'),
      uint8ArrayFromString('world1'),
      new Date()
    )

    await datastore.put(recordKey, existingRecord.serialize().subarray())

    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('/val/hello'),
      closer: [],
      providers: [],
      record: new Libp2pRecord(
        uint8ArrayFromString('/val/hello'),
        uint8ArrayFromString('world2'),
        new Date()
      ).serialize()
    }

    validators.val = async () => {}
    selectors.val = (key, records) => {
      return records[0][records[1].length - 1] > records[1][records[1].length - 1] ? 0 : 1
    }

    await handler.handle(sourcePeer.peerId, msg)

    const updated = Libp2pRecord.deserialize(await datastore.get(recordKey))
    expect(updated.value).to.equalBytes(uint8ArrayFromString('world2'))
  })
})
