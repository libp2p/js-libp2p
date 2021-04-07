'use strict'

const {
  Record: PBRecord
} = require('./record')
const utils = require('../utils')

/**
 * @typedef {{ key: Uint8Array, value: Uint8Array, timeReceived: string }} ProtobufRecord
 */

class Record {
  /**
   * @param {Uint8Array} [key]
   * @param {Uint8Array} [value]
   * @param {Date} [timeReceived]
   */
  constructor (key, value, timeReceived) {
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
    return PBRecord.encode(this.prepareSerialize()).finish()
  }

  /**
   * Return the object format ready to be given to the protobuf library.
   */
  prepareSerialize () {
    return {
      key: this.key,
      value: this.value,
      timeReceived: this.timeReceived && utils.toRFC3339(this.timeReceived)
    }
  }

  /**
   * Decode a protobuf encoded record.
   *
   * @param {Uint8Array} raw
   */
  static deserialize (raw) {
    const message = PBRecord.decode(raw)
    return Record.fromDeserialized(PBRecord.toObject(message, {
      defaults: false,
      arrays: true,
      longs: Number,
      objects: false
    }))
  }

  /**
   * Create a record from the raw object returned from the protobuf library.
   *
   * @param {{ [k: string]: any }} obj
   */
  static fromDeserialized (obj) {
    let recvtime
    if (obj.timeReceived) {
      recvtime = utils.parseRFC3339(obj.timeReceived)
    }

    const rec = new Record(
      obj.key, obj.value, recvtime
    )

    return rec
  }
}

module.exports = Record
