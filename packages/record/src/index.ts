/**
 * @packageDocumentation
 *
 * This is an implementation of the [routing record format](https://github.com/libp2p/specs/blob/b9efe152c29f93f7a87931c14d78ae11e7924d5a/kad-dht/README.md?plain=1#L408-L425) used by libp2p to store data in the datastore passed to the libp2p constructor.
 *
 * @example Deserialization
 *
 * ```TypeScript
 * import { Libp2pRecord } from '@libp2p/record'
 *
 * const buf = Uint8Array.from([0, 1, 2, 3])
 * const record = Libp2pRecord.deserialize(buf)
 * ```
 *
 * @example Serialization
 *
 * ```TypeScript
 * import { Libp2pRecord } from '@libp2p/record'
 *
 * const key = Uint8Array.from([0, 1, 2, 3])
 * const value = Uint8Array.from([0, 1, 2, 3])
 * const timeReceived = new Date()
 *
 * const record = new Libp2pRecord(key, value, timeReceived)
 * const buf = record.serialize()
 * ```
 */

import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { Record } from './record.ts'
import * as utils from './utils.ts'
import type { RecordInput } from './record.ts'
import type { Uint8ArrayList } from 'uint8arraylist'

export class Libp2pRecord {
  public key: Uint8Array<ArrayBuffer>
  public value: Uint8Array<ArrayBuffer>
  public timeReceived: Date

  constructor (key: Uint8Array, value: Uint8Array, timeReceived: Date) {
    if (!(key instanceof Uint8Array)) {
      throw new Error('key must be a Uint8Array')
    }

    if (!(value instanceof Uint8Array)) {
      throw new Error('value must be a Uint8Array')
    }

    this.key = withArrayBuffer(key)
    this.value = withArrayBuffer(value)
    this.timeReceived = timeReceived
  }

  serialize (): Uint8Array<ArrayBuffer> {
    return Record.encode(this.prepareSerialize())
  }

  /**
   * Return the object format ready to be given to the protobuf library.
   */
  prepareSerialize (): RecordInput {
    return {
      key: this.key,
      value: this.value,
      timeReceived: utils.toRFC3339(this.timeReceived)
    }
  }

  /**
   * Decode a protobuf encoded record
   */
  static deserialize (raw: Uint8Array | Uint8ArrayList): Libp2pRecord {
    const rec = Record.decode(raw)

    return new Libp2pRecord(rec.key, rec.value, new Date(rec.timeReceived))
  }

  /**
   * Create a record from the raw object returned from the protobuf library
   */
  static fromDeserialized (obj: Record): Libp2pRecord {
    const receivedTime = utils.parseRFC3339(obj.timeReceived)

    if (obj.key == null) {
      throw new Error('key missing from deserialized object')
    }

    if (obj.value == null) {
      throw new Error('value missing from deserialized object')
    }

    const rec = new Libp2pRecord(
      obj.key, obj.value, receivedTime
    )

    return rec
  }
}
