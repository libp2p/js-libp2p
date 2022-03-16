import { bufferToRecordKey } from '../../utils.js'
import errcode from 'err-code'
import { verifyRecord } from '@libp2p/record/validators'
import { Logger, logger } from '@libp2p/logger'
import type { DHTMessageHandler } from '../index.js'
import type { Validators } from '@libp2p/interfaces/dht'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Message } from '../../message/index.js'
import { Components, Initializable } from '@libp2p/interfaces/components'

export interface PutValueHandlerInit {
  validators: Validators
}

export class PutValueHandler implements DHTMessageHandler, Initializable {
  private readonly log: Logger
  private components: Components = new Components()
  private readonly validators: Validators

  constructor (init: PutValueHandlerInit) {
    const { validators } = init

    this.log = logger('libp2p:kad-dht:rpc:handlers:put-value')
    this.validators = validators
  }

  init (components: Components): void {
    this.components = components
  }

  async handle (peerId: PeerId, msg: Message) {
    const key = msg.key
    this.log('%p asked us to store value for key %b', peerId, key)

    const record = msg.record

    if (record == null) {
      const errMsg = `Empty record from: ${peerId.toString()}`

      this.log.error(errMsg)
      throw errcode(new Error(errMsg), 'ERR_EMPTY_RECORD')
    }

    try {
      await verifyRecord(this.validators, record)

      record.timeReceived = new Date()
      const recordKey = bufferToRecordKey(record.key)
      await this.components.getDatastore().put(recordKey, record.serialize())
      this.log('put record for %b into datastore under key %k', key, recordKey)
    } catch (err: any) {
      this.log('did not put record for key %b into datastore %o', key, err)
    }

    return msg
  }
}
