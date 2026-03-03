import { InvalidMessageError } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { verifyRecord } from '../../record/validators.js'
import { bufferToRecordKey } from '../../utils.js'
import type { Selectors, SelectFn, Validators } from '../../index.js'
import type { Message } from '../../message/dht.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

export interface PutValueHandlerInit {
  validators: Validators
  selectors: Selectors
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
  private readonly selectors: Selectors
  private readonly log: Logger
  private readonly datastorePrefix: string

  constructor (components: PutValueHandlerComponents, init: PutValueHandlerInit) {
    const { validators, selectors } = init

    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:put-value`)
    this.datastorePrefix = `${init.datastorePrefix}/record`
    this.validators = validators
    this.selectors = selectors
  }

  private getRecordSelector (key: Uint8Array): SelectFn | undefined {
    const parts = uint8ArrayToString(key).split('/')

    if (parts.length < 3) {
      return
    }

    return this.selectors[parts[1].toString()]
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message> {
    const key = msg.key
    this.log('%p asked us to store value for key %b', peerId, key)

    if (msg.record == null) {
      this.log.error('empty record from %p', peerId)
      throw new InvalidMessageError(`Empty record from: ${peerId}`)
    }

    try {
      const deserializedRecord = Libp2pRecord.deserialize(msg.record)

      await verifyRecord(this.validators, deserializedRecord)

      const recordKey = bufferToRecordKey(this.datastorePrefix, deserializedRecord.key)

      const selector = this.getRecordSelector(deserializedRecord.key)

      if (selector != null) {
        try {
          const existingRaw = await this.components.datastore.get(recordKey)
          const existingRecord = Libp2pRecord.deserialize(existingRaw)
          const selected = selector(deserializedRecord.key, [deserializedRecord.value, existingRecord.value])

          if (selected !== 0) {
            this.log('ignoring stale value for key %b', key)
            return msg
          }
        } catch (err: any) {
          if (err.name !== 'NotFoundError') {
            throw err
          }
        }
      }

      deserializedRecord.timeReceived = new Date()
      await this.components.datastore.put(recordKey, deserializedRecord.serialize().subarray())
      this.log('put record for %b into datastore under key %k', key, recordKey)
    } catch (err: any) {
      this.log('did not put record for key %b into datastore %o', key, err)
    }

    return msg
  }
}
