import { InvalidMessageError } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import { verifyRecord } from '../../record/validators.js'
import { bufferToRecordKey } from '../../utils.js'
import type { Validators } from '../../index.js'
import type { Message } from '../../message/dht.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

export interface PutValueHandlerInit {
  validators: Validators
  logPrefix: string
  datastorePrefix: string
}

export interface PutValueHandlerComponents {
  datastore: Datastore
  logger: ComponentLogger
}

export class PutValueHandler implements DHTMessageHandler {
  private readonly components: PutValueHandlerComponents
  private readonly validators: Validators
  private readonly log: Logger
  private readonly datastorePrefix: string

  constructor (components: PutValueHandlerComponents, init: PutValueHandlerInit) {
    const { validators } = init

    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:put-value`)
    this.datastorePrefix = `${init.datastorePrefix}/record`
    this.validators = validators
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    const key = msg.key
    this.log('%p asked us to store value for key %b', peerId, key)

    if (msg.record == null) {
      const errMsg = `Empty record from: ${peerId.toString()}`

      this.log.error(errMsg)
      throw new InvalidMessageError(errMsg)
    }

    try {
      const deserializedRecord = Libp2pRecord.deserialize(msg.record)

      await verifyRecord(this.validators, deserializedRecord)

      deserializedRecord.timeReceived = new Date()
      const recordKey = bufferToRecordKey(this.datastorePrefix, deserializedRecord.key)
      await this.components.datastore.put(recordKey, deserializedRecord.serialize().subarray())
      this.log('put record for %b into datastore under key %k', key, recordKey)
    } catch (err: any) {
      this.log('did not put record for key %b into datastore %o', key, err)
    }

    return msg
  }
}
