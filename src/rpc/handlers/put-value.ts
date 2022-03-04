import { bufferToRecordKey } from '../../utils.js'
import errcode from 'err-code'
import { verifyRecord } from '@libp2p/record/validators'
import { Logger, logger } from '@libp2p/logger'
import type { DHTMessageHandler } from '../index.js'
import type { Validators } from '@libp2p/interfaces/dht'
import type { Datastore } from 'interface-datastore'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Message } from '../../message/index.js'
import { base58btc } from 'multiformats/bases/base58'

export interface PutValueHandlerOptions {
  peerId: PeerId
  validators: Validators
  datastore: Datastore
}

export class PutValueHandler implements DHTMessageHandler {
  private readonly validators: Validators
  private readonly datastore: Datastore
  private readonly log: Logger

  constructor (options: PutValueHandlerOptions) {
    const { validators, datastore, peerId } = options

    this.log = logger('libp2p:kad-dht:rpc:handlers:put-value:' + peerId.toString())

    this.validators = validators
    this.datastore = datastore
  }

  async handle (peerId: PeerId, msg: Message) {
    const key = msg.key
    this.log('%p asked us to store value for key %b', peerId, key)

    const record = msg.record

    if (record == null) {
      const errMsg = `Empty record from: ${peerId.toString(base58btc)}`

      this.log.error(errMsg)
      throw errcode(new Error(errMsg), 'ERR_EMPTY_RECORD')
    }

    try {
      await verifyRecord(this.validators, record)

      record.timeReceived = new Date()
      const recordKey = bufferToRecordKey(record.key)
      await this.datastore.put(recordKey, record.serialize())
      this.log('put record for %b into datastore under key %k', key, recordKey)
    } catch (err: any) {
      this.log('did not put record for key %b into datastore %o', key, err)
    }

    return msg
  }
}
