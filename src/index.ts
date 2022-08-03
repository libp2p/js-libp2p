import type { Uint8ArrayList } from 'uint8arraylist'
import {
  Record
} from './record.js'
import * as utils from './utils.js'

export class Libp2pRecord {
  public key: Uint8Array
  public value: Uint8Array
  public timeReceived: Date

  constructor (key: Uint8Array, value: Uint8Array, timeReceived: Date) {
    if (!(key instanceof Uint8Array)) {
      throw new Error('key must be a Uint8Array')
    }

    if (!(value instanceof Uint8Array)) {
      throw new Error('value must be a Uint8Array')
    }

    this.key = key
    this.value = value
    this.timeReceived = timeReceived
  }

  serialize () {
    return Record.encode(this.prepareSerialize())
  }

  /**
   * Return the object format ready to be given to the protobuf library.
   */
  prepareSerialize () {
    return {
      key: this.key,
      value: this.value,
      timeReceived: utils.toRFC3339(this.timeReceived)
    }
  }

  /**
   * Decode a protobuf encoded record
   */
  static deserialize (raw: Uint8Array | Uint8ArrayList) {
    const rec = Record.decode(raw)

    return new Libp2pRecord(rec.key, rec.value, new Date(rec.timeReceived))
  }

  /**
   * Create a record from the raw object returned from the protobuf library
   */
  static fromDeserialized (obj: Record) {
    const recvtime = utils.parseRFC3339(obj.timeReceived)

    if (obj.key == null) {
      throw new Error('key missing from deserialized object')
    }

    if (obj.value == null) {
      throw new Error('value missing from deserialized object')
    }

    const rec = new Libp2pRecord(
      obj.key, obj.value, recvtime
    )

    return rec
  }
}
