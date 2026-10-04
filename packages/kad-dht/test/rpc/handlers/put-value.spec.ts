/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

import { defaultLogger } from '@libp2p/logger'
import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MessageType } from '../../../src/message/dht.ts'
import { PutValueHandler } from '../../../src/rpc/handlers/put-value.ts'
import * as utils from '../../../src/utils.ts'
import { createPeerIdWithPrivateKey } from '../../utils/create-peer-id.ts'
import type { Validators } from '../../../src/index.ts'
import type { Message } from '../../../src/message/dht.ts'
import type { PeerAndKey } from '../../utils/create-peer-id.ts'
import type { Datastore } from 'interface-datastore'

const T = MessageType.PUT_VALUE

describe('rpc - handlers - PutValue', () => {
  let sourcePeer: PeerAndKey
  let handler: PutValueHandler
  let datastore: Datastore
  let validators: Validators

  beforeEach(async () => {
    sourcePeer = await createPeerIdWithPrivateKey()
    datastore = new MemoryDatastore()
    validators = {}

    const components = {
      datastore,
      logger: defaultLogger()
    }

    handler = new PutValueHandler(components, {
      validators,
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
    const recordKey = uint8ArrayFromString('/val/hello')
    const msg: Message = {
      type: T,
      key: recordKey,
      closer: [],
      providers: []
    }
    const record = new Libp2pRecord(
      recordKey,
      uint8ArrayFromString('world'),
      new Date()
    )
    msg.record = record.serialize()
    validators.val = async () => {}

    const response = await handler.handle(sourcePeer.peerId, msg)
    expect(response).to.deep.equal(msg)

    const key = utils.bufferToRecordKey('/dht/record', recordKey)
    const res = await datastore.get(key)

    const rec = Libp2pRecord.deserialize(res)

    expect(rec).to.have.property('key').eql(recordKey)

    if (rec.timeReceived == null) {
      throw new Error('Libp2pRecord timeReceived not set')
    }

    // make sure some time has passed
    await delay(10)
    expect(rec.timeReceived.getTime()).to.be.lessThan(Date.now())
  })

  it('does not store records whose key has no namespace', async () => {
    const craftedKey = new Uint8Array([0x01, 0x02, 0x03])
    const record = new Libp2pRecord(
      craftedKey,
      uint8ArrayFromString('world'),
      new Date()
    )
    const msg: Message = {
      type: T,
      key: craftedKey,
      record: record.serialize(),
      closer: [],
      providers: []
    }

    await expect(handler.handle(sourcePeer.peerId, msg)).to.eventually.be.rejected
      .with.property('name', 'InvalidParametersError')

    const key = utils.bufferToRecordKey('/dht/record', craftedKey)
    expect(await datastore.has(key)).to.equal(false)
  })
})
