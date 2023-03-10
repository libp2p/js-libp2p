import { bufferToRecordKey } from '../../utils.js'
import { CodeError } from '@libp2p/interfaces/errors'
import { verifyRecord } from '@libp2p/record/validators'
import { Logger, logger } from '@libp2p/logger'
import type { DHTMessageHandler } from '../index.js'
import type { Validators } from '@libp2p/interface-dht'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Message } from '../../message/index.js'
import type { Datastore } from 'interface-datastore'

export interface PutValueHandlerInit {
  validators: Validators
}

export interface PutValueHandlerComponents {
  datastore: Datastore
}

export class PutValueHandler implements DHTMessageHandler {
  private readonly log: Logger
  private readonly components: PutValueHandlerComponents
  private readonly validators: Validators

  constructor (components: PutValueHandlerComponents, init: PutValueHandlerInit) {
    const { validators } = init

    this.components = components
    this.log = logger('libp2p:kad-dht:rpc:handlers:put-value')
    this.validators = validators
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    const key = msg.key
    this.log('%p asked us to store value for key %b', peerId, key)

    const record = msg.record

    if (record == null) {
      const errMsg = `Empty record from: ${peerId.toString()}`

      this.log.error(errMsg)
      throw new CodeError(errMsg, 'ERR_EMPTY_RECORD')
    }

    try {
      await verifyRecord(this.validators, record)

      record.timeReceived = new Date()
      const recordKey = bufferToRecordKey(record.key)
      await this.components.datastore.put(recordKey, record.serialize().subarray())
      this.log('put record for %b into datastore under key %k', key, recordKey)
    } catch (err: any) {
      this.log('did not put record for key %b into datastore %o', key, err)
    }

    return msg
  }
}
